use reqwest::header::{AUTHORIZATION, CONTENT_TYPE};
use serde_json::Value;

use crate::error::AppError;
use crate::providers::ProviderRequest;

const API_URL: &str = "https://api.mistral.ai/v1/chat/completions";

pub async fn send(req: &ProviderRequest) -> Result<String, AppError> {
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
            "Mistral API error ({status}): {text}"
        )));
    }

    let data: Value = resp.json().await?;
    let reply = data["choices"][0]["message"]["content"]
        .as_str()
        .unwrap_or("")
        .to_string();

    Ok(reply)
}
