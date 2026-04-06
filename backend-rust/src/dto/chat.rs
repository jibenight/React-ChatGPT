use serde::{Deserialize, Serialize};
use validator::Validate;

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct AttachmentPayload {
  pub name: Option<String>,
  pub mime_type: Option<String>,
  #[serde(rename = "mimeType")]
  pub mime_type_camel: Option<String>,
  #[serde(rename = "type")]
  pub attachment_type: Option<String>,
  #[serde(rename = "dataUrl")]
  pub data_url: Option<String>,
  #[serde(rename = "fileUri")]
  pub file_uri: Option<String>,
  pub size_bytes: Option<i64>,
}

impl AttachmentPayload {
  pub fn effective_mime_type(&self) -> Option<&str> {
    self.mime_type.as_deref().or(self.mime_type_camel.as_deref())
  }
}

#[derive(Debug, Deserialize, Validate)]
pub struct ChatMessageRequest {
  pub thread_id: Option<String>,
  pub session_id: Option<String>,
  #[validate(length(max = 30000))]
  pub message: Option<String>,
  pub attachments: Option<Vec<AttachmentPayload>>,
  pub provider: Option<String>,
  pub model: Option<String>,
  pub project_id: Option<i64>,
}
