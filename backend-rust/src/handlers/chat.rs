use crate::{
  db::DbPool,
  dto::chat::{AttachmentPayload, ChatMessageRequest},
  error::AppError,
  extractors::{AuthUser, ValidatedJson},
  providers::{self, ChatMessage, Provider, ProviderOpts},
  services::usage,
  state::AppState,
};
use axum::{
  extract::State,
  response::{
    sse::{Event, KeepAlive, Sse},
    IntoResponse,
  },
};
use serde_json::json;
use std::convert::Infallible;
use tokio::sync::mpsc;
use tokio_stream::wrappers::ReceiverStream;
use uuid::Uuid;

const MAX_MESSAGE_LENGTH: usize = 30000;
const MAX_ATTACHMENTS: usize = 4;
const MAX_ATTACHMENT_BYTES: usize = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES: &[&str] = &["image/jpeg", "image/png", "image/webp", "image/gif"];

/// Sanitize input: strip HTML tags (keep text content).
fn sanitize(input: &str) -> String {
  ammonia::Builder::default()
    .tags(std::collections::HashSet::new())
    .clean(input)
    .to_string()
}

/// Validate attachment list; returns Err with a descriptive message on failure.
fn validate_attachments(attachments: &[AttachmentPayload]) -> Result<(), String> {
  if attachments.len() > MAX_ATTACHMENTS {
    return Err("Too many attachments".to_string());
  }
  for att in attachments {
    if let Some(data_url) = &att.data_url {
      // data_url format: "data:<mime>;base64,<data>"
      let parts: Vec<&str> = data_url.splitn(2, ',').collect();
      if parts.len() != 2 {
        return Err("Invalid attachment data".to_string());
      }
      let header = parts[0]; // "data:image/jpeg;base64"
      let base64_data = parts[1];

      let mime_type = header
        .strip_prefix("data:")
        .and_then(|s| s.split(';').next())
        .unwrap_or("");

      if !ALLOWED_IMAGE_TYPES.contains(&mime_type) {
        return Err(format!("Unsupported attachment type: {}", mime_type));
      }

      use base64::Engine;
      let decoded = base64::engine::general_purpose::STANDARD
        .decode(base64_data)
        .map_err(|_| "Invalid attachment data".to_string())?;

      if decoded.len() > MAX_ATTACHMENT_BYTES {
        return Err("Attachment too large".to_string());
      }
    }

    if let Some(uri) = &att.file_uri {
      if uri.is_empty() {
        return Err("Invalid attachment reference".to_string());
      }
    }
  }
  Ok(())
}

pub async fn send_message(
  State(state): State<AppState>,
  auth: AuthUser,
  ValidatedJson(body): ValidatedJson<ChatMessageRequest>,
) -> Result<impl IntoResponse, AppError> {
  // --- Resolve thread ID ---
  let active_thread_id = body
    .thread_id
    .clone()
    .or_else(|| body.session_id.clone())
    .ok_or_else(|| AppError::BadRequest("threadId or sessionId is required".to_string()))?;

  // --- Validate message / attachments ---
  let raw_message = body.message.as_deref().unwrap_or("").trim().to_string();
  let sanitized_message = sanitize(&raw_message);
  let attachments = body.attachments.unwrap_or_default();

  if sanitized_message.is_empty() && attachments.is_empty() {
    return Err(AppError::BadRequest(
      "message or attachments required".to_string(),
    ));
  }

  if sanitized_message.len() > MAX_MESSAGE_LENGTH {
    return Err(AppError::BadRequest("Message too long".to_string()));
  }

  validate_attachments(&attachments)
    .map_err(AppError::BadRequest)?;

  // --- Resolve provider + model ---
  let provider_str = body.provider.as_deref().unwrap_or("openai");
  let provider = Provider::from_str(provider_str)
    .ok_or_else(|| AppError::BadRequest(format!("Unsupported provider: {}", provider_str)))?;
  let model = body
    .model
    .filter(|s| !s.is_empty())
    .unwrap_or_else(|| provider.default_model().to_string());

  // --- Decrypt API key ---
  let api_key = crate::handlers::users::get_decrypted_api_key(&state, auth.id, provider_str).await?;

  // --- Check / create thread ---
  #[derive(sqlx::FromRow)]
  struct ThreadRow {
    project_id: Option<i64>,
  }

  let thread_row: Option<ThreadRow> = match &state.db {
    DbPool::Sqlite(pool) => {
      sqlx::query_as::<_, ThreadRow>(
        "SELECT project_id FROM threads WHERE id = ? AND user_id = ? LIMIT 1",
      )
      .bind(&active_thread_id)
      .bind(auth.id)
      .fetch_optional(pool)
      .await?
    }
    DbPool::Postgres(pool) => {
      sqlx::query_as::<_, ThreadRow>(
        "SELECT project_id FROM threads WHERE id = $1 AND user_id = $2 LIMIT 1",
      )
      .bind(&active_thread_id)
      .bind(auth.id)
      .fetch_optional(pool)
      .await?
    }
  };

  let is_new_thread = thread_row.is_none();

  // --- Store user message (and create thread if needed) ---
  let title_source = if !sanitized_message.is_empty() {
    sanitized_message.chars().take(60).collect::<String>()
  } else {
    "Nouvelle conversation".to_string()
  };

  let attachments_json: Option<String> = if attachments.is_empty() {
    None
  } else {
    Some(serde_json::to_string(&attachments).unwrap_or_default())
  };

  match &state.db {
    DbPool::Sqlite(pool) => {
      if is_new_thread {
        sqlx::query(
          "INSERT INTO threads (id, user_id, project_id, title, last_message_at)
           VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)",
        )
        .bind(&active_thread_id)
        .bind(auth.id)
        .bind(body.project_id)
        .bind(&title_source)
        .execute(pool)
        .await?;
      } else if let Some(ref row) = thread_row {
        if row.project_id.is_none() {
          if let Some(pid) = body.project_id {
            sqlx::query(
              "UPDATE threads SET project_id = ?, updated_at = CURRENT_TIMESTAMP
               WHERE id = ? AND user_id = ?",
            )
            .bind(pid)
            .bind(&active_thread_id)
            .bind(auth.id)
            .execute(pool)
            .await?;
          }
        }
      }

      sqlx::query(
        "INSERT INTO messages (thread_id, role, content, attachments, provider, model)
         VALUES (?, ?, ?, ?, ?, ?)",
      )
      .bind(&active_thread_id)
      .bind("user")
      .bind(&sanitized_message)
      .bind(&attachments_json)
      .bind(provider_str)
      .bind(&model)
      .execute(pool)
      .await?;
    }
    DbPool::Postgres(pool) => {
      if is_new_thread {
        sqlx::query(
          "INSERT INTO threads (id, user_id, project_id, title, last_message_at)
           VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)",
        )
        .bind(&active_thread_id)
        .bind(auth.id)
        .bind(body.project_id)
        .bind(&title_source)
        .execute(pool)
        .await?;
      } else if let Some(ref row) = thread_row {
        if row.project_id.is_none() {
          if let Some(pid) = body.project_id {
            sqlx::query(
              "UPDATE threads SET project_id = $1, updated_at = CURRENT_TIMESTAMP
               WHERE id = $2 AND user_id = $3",
            )
            .bind(pid)
            .bind(&active_thread_id)
            .bind(auth.id)
            .execute(pool)
            .await?;
          }
        }
      }

      sqlx::query(
        "INSERT INTO messages (thread_id, role, content, attachments, provider, model)
         VALUES ($1, $2, $3, $4, $5, $6)",
      )
      .bind(&active_thread_id)
      .bind("user")
      .bind(&sanitized_message)
      .bind(&attachments_json)
      .bind(provider_str)
      .bind(&model)
      .execute(pool)
      .await?;
    }
  }

  // --- Build project context ---
  let effective_project_id = thread_row
    .as_ref()
    .and_then(|r| r.project_id)
    .or(body.project_id);

  let system_prompt: Option<String> = if let Some(pid) = effective_project_id {
    #[derive(sqlx::FromRow)]
    struct ProjectRow {
      instructions: Option<String>,
      context_data: Option<String>,
    }

    let proj: Option<ProjectRow> = match &state.db {
      DbPool::Sqlite(pool) => {
        sqlx::query_as::<_, ProjectRow>(
          "SELECT instructions, context_data FROM projects WHERE id = ? AND user_id = ? LIMIT 1",
        )
        .bind(pid)
        .bind(auth.id)
        .fetch_optional(pool)
        .await?
      }
      DbPool::Postgres(pool) => {
        sqlx::query_as::<_, ProjectRow>(
          "SELECT instructions, context_data FROM projects WHERE id = $1 AND user_id = $2 LIMIT 1",
        )
        .bind(pid)
        .bind(auth.id)
        .fetch_optional(pool)
        .await?
      }
    };

    if let Some(p) = proj {
      let mut parts: Vec<String> = Vec::new();
      if let Some(instr) = p.instructions.filter(|s| !s.is_empty()) {
        parts.push(format!("Project instructions:\n{}", instr));
      }
      if let Some(ctx) = p.context_data.filter(|s| !s.is_empty()) {
        parts.push(format!("Project context:\n{}", ctx));
      }
      if parts.is_empty() {
        None
      } else {
        Some(parts.join("\n\n"))
      }
    } else {
      None
    }
  } else {
    None
  };

  // --- Load last 50 messages (history) ---
  #[derive(sqlx::FromRow)]
  struct MsgRow {
    role: String,
    content: String,
  }

  let history_rows: Vec<MsgRow> = match &state.db {
    DbPool::Sqlite(pool) => {
      sqlx::query_as::<_, MsgRow>(
        "SELECT role, content FROM messages WHERE thread_id = ?
         ORDER BY id DESC LIMIT 50",
      )
      .bind(&active_thread_id)
      .fetch_all(pool)
      .await?
    }
    DbPool::Postgres(pool) => {
      sqlx::query_as::<_, MsgRow>(
        "SELECT role, content FROM messages WHERE thread_id = $1
         ORDER BY id DESC LIMIT 50",
      )
      .bind(&active_thread_id)
      .fetch_all(pool)
      .await?
    }
  };

  // Reverse to chronological order (we fetched DESC)
  let mut history: Vec<ChatMessage> = history_rows
    .into_iter()
    .rev()
    .map(|r| ChatMessage {
      role: r.role,
      content: r.content,
    })
    .collect();

  // Build final messages: system (if any) prepended for OpenAI-style providers
  // For Claude, system is passed separately; here we merge into the messages array
  // and the provider handler decides what to do with system_prompt.
  // For OpenAI/Mistral/Groq we prepend system message to the history.
  let messages = match provider {
    Provider::Claude | Provider::Gemini => history.clone(),
    _ => {
      let mut msgs = Vec::new();
      if let Some(ref sys) = system_prompt {
        if !sys.is_empty() {
          msgs.push(ChatMessage {
            role: "system".to_string(),
            content: sys.clone(),
          });
        }
      }
      msgs.append(&mut history);
      msgs
    }
  };

  // --- SSE channel ---
  let (tx, rx) = mpsc::channel::<Result<Event, Infallible>>(32);

  // Clone what we need to move into the task
  let db = state.db.clone();
  let http_client = state.http_client.clone();
  let thread_id_clone = active_thread_id.clone();
  let user_id = auth.id;
  let provider_str_clone = provider_str.to_string();
  let model_clone = model.clone();

  let opts = ProviderOpts {
    provider,
    api_key,
    model,
    messages,
    system_prompt,
    http_client,
  };

  tokio::spawn(async move {
    let tx_clone = tx.clone();

    let result = providers::route_to_provider(opts, tx_clone).await;

    match result {
      Ok(reply) => {
        // Store assistant message
        let store_result = store_assistant_message(
          &db,
          &thread_id_clone,
          user_id,
          &reply,
          &provider_str_clone,
          &model_clone,
        )
        .await;

        if let Err(e) = store_result {
          tracing::error!(error = %e, "Failed to store assistant message");
        }

        // Increment daily usage
        if let Err(e) = usage::increment_daily_usage(&db, user_id).await {
          tracing::warn!(error = %e, "Failed to increment daily usage");
        }

        // Send done event
        let done_event =
          json!({ "type": "done", "reply": reply, "threadId": thread_id_clone }).to_string();
        let _ = tx.send(Ok(Event::default().data(done_event))).await;
      }
      Err(e) => {
        tracing::error!(error = %e, "Provider stream error");
        let err_event = json!({ "type": "error", "error": e.to_string() }).to_string();
        let _ = tx.send(Ok(Event::default().data(err_event))).await;
      }
    }
  });

  let stream = ReceiverStream::new(rx);
  Ok(Sse::new(stream).keep_alive(KeepAlive::default()))
}

async fn store_assistant_message(
  db: &DbPool,
  thread_id: &str,
  user_id: i64,
  reply: &str,
  provider: &str,
  model: &str,
) -> Result<(), sqlx::Error> {
  match db {
    DbPool::Sqlite(pool) => {
      sqlx::query(
        "INSERT INTO messages (thread_id, role, content, provider, model)
         VALUES (?, ?, ?, ?, ?)",
      )
      .bind(thread_id)
      .bind("assistant")
      .bind(reply)
      .bind(provider)
      .bind(model)
      .execute(pool)
      .await?;

      sqlx::query(
        "UPDATE threads SET last_message_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND user_id = ?",
      )
      .bind(thread_id)
      .bind(user_id)
      .execute(pool)
      .await?;
    }
    DbPool::Postgres(pool) => {
      sqlx::query(
        "INSERT INTO messages (thread_id, role, content, provider, model)
         VALUES ($1, $2, $3, $4, $5)",
      )
      .bind(thread_id)
      .bind("assistant")
      .bind(reply)
      .bind(provider)
      .bind(model)
      .execute(pool)
      .await?;

      sqlx::query(
        "UPDATE threads SET last_message_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND user_id = $2",
      )
      .bind(thread_id)
      .bind(user_id)
      .execute(pool)
      .await?;
    }
  }

  Ok(())
}
