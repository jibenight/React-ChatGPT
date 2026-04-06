use super::{ChatMessage, ProviderOpts};
use crate::error::AppError;
use axum::response::sse::Event;
use futures::StreamExt;
use reqwest_eventsource::{Event as EsEvent, EventSource};
use serde_json::{json, Value};
use std::convert::Infallible;
use tokio::sync::mpsc::Sender;

pub async fn handle(
  opts: ProviderOpts,
  tx: Sender<Result<Event, Infallible>>,
) -> Result<String, AppError> {
  let messages: Vec<Value> = opts
    .messages
    .iter()
    .map(|m| json!({ "role": m.role, "content": m.content }))
    .collect();

  let body = json!({
    "model": opts.model,
    "messages": messages,
    "stream": true,
  });

  let mut es = EventSource::new(
    opts
      .http_client
      .post("https://api.mistral.ai/v1/chat/completions")
      .header("Authorization", format!("Bearer {}", opts.api_key))
      .header("Content-Type", "application/json")
      .json(&body),
  )
  .map_err(|e| AppError::Internal(format!("Mistral EventSource error: {}", e)))?;

  let mut reply = String::new();

  while let Some(event) = es.next().await {
    match event {
      Ok(EsEvent::Message(msg)) => {
        if msg.data == "[DONE]" {
          break;
        }
        let parsed: Value = match serde_json::from_str(&msg.data) {
          Ok(v) => v,
          Err(_) => continue,
        };
        if let Some(delta) = parsed["choices"][0]["delta"]["content"].as_str() {
          if !delta.is_empty() {
            reply.push_str(delta);
            let event_data = json!({ "type": "delta", "content": delta }).to_string();
            let _ = tx.send(Ok(Event::default().data(event_data))).await;
          }
        }
      }
      Ok(EsEvent::Open) => {}
      Err(reqwest_eventsource::Error::StreamEnded) => break,
      Err(e) => {
        tracing::warn!(error = %e, "Mistral SSE stream error");
        break;
      }
    }
  }

  Ok(reply)
}
