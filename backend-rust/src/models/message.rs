use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Message {
    pub id: i64,
    /// References threads.id (TEXT/UUID)
    pub thread_id: String,
    pub role: String,
    pub content: String,
    /// JSON-encoded list of Attachment
    pub attachments: Option<String>,
    pub provider: Option<String>,
    pub model: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Attachment {
    pub name: String,
    pub mime_type: String,
    /// Base64-encoded content or URL
    pub data: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct SearchResult {
    pub id: i64,
    pub thread_id: String,
    pub role: String,
    pub content: String,
    pub created_at: String,
    /// Relevance rank from FTS (SQLite) or ts_rank (Postgres)
    pub rank: Option<f64>,
}
