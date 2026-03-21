use futures::StreamExt;
use reqwest::header::{AUTHORIZATION, CONTENT_TYPE};
use serde_json::Value;

use crate::error::AppError;
use crate::providers::ProviderRequest;

const API_URL: &str = "https://api.groq.com/openai/v1/chat/completions";

pub async fn send(
    req: &ProviderRequest,
    on_delta: impl Fn(String) + Send + 'static,
) -> Result<String, AppError> {
    let mut messages = Vec::new();

    if let Some(ref sys) = req.system_prompt {
        messages.push(serde_json::json!({
            "role": "system",
            "content": sys,
        }));
    }

    for m in &req.messages {
        messages.push(serde_json::json!({
            "role": m.role,
            "content": m.content,
        }));
    }

    let body = serde_json::json!({
        "model": req.model,
        "messages": messages,
        "stream": true,
    });

    let client = reqwest::Client::new();
    let resp = client
        .post(API_URL)
        .header(AUTHORIZATION, format!("Bearer {}", req.api_key))
        .header(CONTENT_TYPE, "application/json")
        .json(&body)
        .send()
        .await?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(AppError::Provider(format!(
            "Groq API error ({status}): {text}"
        )));
    }

    let mut stream = resp.bytes_stream();
    let mut full_reply = String::new();
    let mut buffer = String::new();

    while let Some(chunk) = stream.next().await {
        let bytes = chunk?;
        buffer.push_str(&String::from_utf8_lossy(&bytes));

        while let Some(pos) = buffer.find('\n') {
            let line = buffer[..pos].to_string();
            buffer = buffer[pos + 1..].to_string();

            let line = line.trim();
            if line.is_empty() || line == "data: [DONE]" {
                continue;
            }
            if let Some(data) = line.strip_prefix("data: ") {
                if let Ok(parsed) = serde_json::from_str::<Value>(data) {
                    if let Some(content) = parsed["choices"][0]["delta"]["content"].as_str() {
                        full_reply.push_str(content);
                        on_delta(content.to_string());
                    }
                }
            }
        }
    }

    Ok(full_reply)
}
