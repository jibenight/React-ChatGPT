use super::{ChatMessage, ProviderOpts};
use crate::error::AppError;
use axum::response::sse::Event;
use serde_json::{json, Value};
use std::convert::Infallible;
use tokio::sync::mpsc::Sender;

pub async fn handle(
  opts: ProviderOpts,
  tx: Sender<Result<Event, Infallible>>,
) -> Result<String, AppError> {
  // Build contents array: Gemini uses role "user"/"model"
  let mut contents: Vec<Value> = Vec::new();

  // If system prompt, prepend as user message (Gemini doesn't have a system role in basic API)
  if let Some(ref sys) = opts.system_prompt {
    if !sys.is_empty() {
      contents.push(json!({
        "role": "user",
        "parts": [{ "text": sys }]
      }));
    }
  }

  for msg in &opts.messages {
    let gemini_role = if msg.role == "assistant" { "model" } else { "user" };
    contents.push(json!({
      "role": gemini_role,
      "parts": [{ "text": msg.content }]
    }));
  }

  let body = json!({ "contents": contents });

  let url = format!(
    "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
    opts.model, opts.api_key
  );

  let resp = opts
    .http_client
    .post(&url)
    .header("Content-Type", "application/json")
    .json(&body)
    .send()
    .await
    .map_err(|e| AppError::Internal(format!("Gemini request error: {}", e)))?;

  if !resp.status().is_success() {
    let status = resp.status().as_u16();
    let body_text = resp.text().await.unwrap_or_default();
    return Err(AppError::Internal(format!(
      "Gemini API error {}: {}",
      status, body_text
    )));
  }

  let data: Value = resp
    .json()
    .await
    .map_err(|e| AppError::Internal(format!("Gemini JSON parse error: {}", e)))?;

  let reply = data["candidates"][0]["content"]["parts"][0]["text"]
    .as_str()
    .unwrap_or("")
    .to_string();

  // Gemini is non-streaming: send a single delta then done
  if !reply.is_empty() {
    let event_data = json!({ "type": "delta", "content": reply }).to_string();
    let _ = tx.send(Ok(Event::default().data(event_data))).await;
  }

  Ok(reply)
}
