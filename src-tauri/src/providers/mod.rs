pub mod claude;
pub mod gemini;
pub mod groq;
pub mod mistral;
pub mod openai;

use serde::{Deserialize, Serialize};

use crate::error::AppError;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Clone)]
pub struct ProviderRequest {
    pub api_key: String,
    pub model: String,
    pub messages: Vec<ChatMessage>,
    pub system_prompt: Option<String>,
}

/// Route to the correct provider and return the full reply.
/// For streaming providers, deltas are sent via the callback.
pub async fn route_to_provider(
    provider: &str,
    req: ProviderRequest,
    on_delta: impl Fn(String) + Send + 'static,
) -> Result<String, AppError> {
    match provider {
        "openai" => openai::send(&req, on_delta).await,
        "groq" => groq::send(&req, on_delta).await,
        "claude" => claude::send(&req).await,
        "gemini" => gemini::send(&req).await,
        "mistral" => mistral::send(&req).await,
        _ => Err(AppError::Validation(format!("Unsupported provider: {provider}"))),
    }
}
