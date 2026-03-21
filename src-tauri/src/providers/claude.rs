use reqwest::header::CONTENT_TYPE;
use serde_json::Value;

use crate::error::AppError;
use crate::providers::ProviderRequest;

const API_URL: &str = "https://api.anthropic.com/v1/messages";

pub async fn send(req: &ProviderRequest) -> Result<String, AppError> {
    let messages: Vec<Value> = req
        .messages
        .iter()
        .map(|m| {
            serde_json::json!({
                "role": m.role,
                "content": m.content,
            })
        })
        .collect();

    let mut body = serde_json::json!({
        "model": req.model,
        "max_tokens": 4096,
        "messages": messages,
    });

    if let Some(ref sys) = req.system_prompt {
        body["system"] = Value::String(sys.clone());
    }

    let client = reqwest::Client::new();
    let resp = client
        .post(API_URL)
        .header("x-api-key", &req.api_key)
        .header("anthropic-version", "2023-06-01")
        .header(CONTENT_TYPE, "application/json")
        .json(&body)
        .send()
        .await?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(AppError::Provider(format!(
            "Claude API error ({status}): {text}"
        )));
    }

    let data: Value = resp.json().await?;
    let reply = data["content"][0]["text"]
        .as_str()
        .unwrap_or("")
        .to_string();

    Ok(reply)
}
