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

  let mut body = json!({
    "model": opts.model,
    "max_tokens": 8096,
    "messages": messages,
    "stream": true,
  });

  if let Some(ref sys) = opts.system_prompt {
    if !sys.is_empty() {
      body["system"] = json!(sys);
    }
  }

  let mut es = EventSource::new(
    opts
      .http_client
      .post("https://api.anthropic.com/v1/messages")
      .header("x-api-key", &opts.api_key)
      .header("anthropic-version", "2023-06-01")
      .header("Content-Type", "application/json")
      .json(&body),
  )
  .map_err(|e| AppError::Internal(format!("Claude EventSource error: {}", e)))?;

  let mut reply = String::new();

  while let Some(event) = es.next().await {
    match event {
      Ok(EsEvent::Message(msg)) => {
        // Claude sends typed SSE events; we parse the data payload
        let parsed: Value = match serde_json::from_str(&msg.data) {
          Ok(v) => v,
          Err(_) => continue,
        };

        // event type "content_block_delta" carries incremental text
        if parsed["type"] == "content_block_delta" {
          if let Some(text) = parsed["delta"]["text"].as_str() {
            if !text.is_empty() {
              reply.push_str(text);
              let event_data = json!({ "type": "delta", "content": text }).to_string();
              let _ = tx.send(Ok(Event::default().data(event_data))).await;
            }
          }
        }

        // "message_stop" signals end of stream
        if parsed["type"] == "message_stop" {
          break;
        }
      }
      Ok(EsEvent::Open) => {}
      Err(reqwest_eventsource::Error::StreamEnded) => break,
      Err(e) => {
        tracing::warn!(error = %e, "Claude SSE stream error");
        break;
      }
    }
  }

  Ok(reply)
}
