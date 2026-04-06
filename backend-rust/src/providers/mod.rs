pub mod claude;
pub mod gemini;
pub mod groq;
pub mod mistral;
pub mod openai;

use crate::error::AppError;
use serde::{Deserialize, Serialize};
use std::convert::Infallible;
use tokio::sync::mpsc::Sender;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Provider {
  Openai,
  Gemini,
  Claude,
  Mistral,
  Groq,
}

impl Provider {
  pub fn default_model(&self) -> &'static str {
    match self {
      Provider::Openai => "gpt-4o",
      Provider::Gemini => "gemini-2.5-pro",
      Provider::Claude => "claude-3-5-sonnet-20240620",
      Provider::Mistral => "mistral-large-latest",
      Provider::Groq => "llama-3.3-70b-versatile",
    }
  }

  pub fn from_str(s: &str) -> Option<Self> {
    match s.to_lowercase().as_str() {
      "openai" => Some(Provider::Openai),
      "gemini" => Some(Provider::Gemini),
      "claude" => Some(Provider::Claude),
      "mistral" => Some(Provider::Mistral),
      "groq" => Some(Provider::Groq),
      _ => None,
    }
  }
}

/// A single chat message for provider API calls.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatMessage {
  pub role: String,
  pub content: String,
}

pub struct ProviderOpts {
  pub provider: Provider,
  pub api_key: String,
  pub model: String,
  pub messages: Vec<ChatMessage>,
  pub system_prompt: Option<String>,
  pub http_client: reqwest::Client,
}

pub async fn route_to_provider(
  opts: ProviderOpts,
  tx: Sender<Result<axum::response::sse::Event, Infallible>>,
) -> Result<String, AppError> {
  match opts.provider {
    Provider::Openai => openai::handle(opts, tx).await,
    Provider::Gemini => gemini::handle(opts, tx).await,
    Provider::Claude => claude::handle(opts, tx).await,
    Provider::Mistral => mistral::handle(opts, tx).await,
    Provider::Groq => groq::handle(opts, tx).await,
  }
}
