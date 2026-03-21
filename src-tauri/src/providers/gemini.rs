use reqwest::header::CONTENT_TYPE;
use serde_json::Value;

use crate::error::AppError;
use crate::providers::ProviderRequest;

pub async fn send(req: &ProviderRequest) -> Result<String, AppError> {
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
        req.model, req.api_key
    );

    // Build contents array (Gemini uses "user" / "model" roles)
    let mut contents = Vec::new();

    // System prompt injected as first user message (Gemini doesn't have system role natively)
    if let Some(ref sys) = req.system_prompt {
        contents.push(serde_json::json!({
            "role": "user",
            "parts": [{ "text": sys }]
        }));
        contents.push(serde_json::json!({
            "role": "model",
            "parts": [{ "text": "Understood. I will follow these instructions." }]
        }));
    }

    for m in &req.messages {
        let role = if m.role == "assistant" { "model" } else { "user" };
        contents.push(serde_json::json!({
            "role": role,
            "parts": [{ "text": m.content }]
        }));
    }

    let body = serde_json::json!({
        "contents": contents,
    });

    let client = reqwest::Client::new();
    let resp = client
        .post(&url)
        .header(CONTENT_TYPE, "application/json")
        .json(&body)
        .send()
        .await?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(AppError::Provider(format!(
            "Gemini API error ({status}): {text}"
        )));
    }

    let data: Value = resp.json().await?;
    let reply = data["candidates"][0]["content"]["parts"][0]["text"]
        .as_str()
        .unwrap_or("")
        .to_string();

    Ok(reply)
}
