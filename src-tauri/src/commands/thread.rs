use serde::{Deserialize, Serialize};
use tauri::State;

use crate::error::AppError;
use crate::state::AppState;

#[derive(Debug, Serialize)]
pub struct Thread {
    pub id: String,
    pub project_id: Option<i64>,
    pub title: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub last_message_at: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct Message {
    pub id: i64,
    pub role: String,
    pub content: String,
    pub attachments: Option<serde_json::Value>,
    pub provider: Option<String>,
    pub model: Option<String>,
    pub created_at: Option<String>,
}

// ── List threads ──

#[tauri::command]
pub fn list_threads(
    state: State<'_, AppState>,
    project_id: Option<i64>,
) -> Result<Vec<Thread>, AppError> {
    let db = state.db.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    let (sql, params): (String, Vec<Box<dyn rusqlite::types::ToSql>>) = match project_id {
        Some(pid) => (
            "SELECT id, project_id, title, created_at, updated_at, last_message_at
             FROM threads WHERE user_id = 1 AND project_id = ?1
             ORDER BY last_message_at DESC, updated_at DESC"
                .into(),
            vec![Box::new(pid)],
        ),
        None => (
            "SELECT id, project_id, title, created_at, updated_at, last_message_at
             FROM threads WHERE user_id = 1
             ORDER BY last_message_at DESC, updated_at DESC"
                .into(),
            vec![],
        ),
    };
    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    let mut stmt = db.prepare(&sql)?;
    let threads = stmt
        .query_map(param_refs.as_slice(), |row| {
            Ok(Thread {
                id: row.get(0)?,
                project_id: row.get(1)?,
                title: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
                last_message_at: row.get(5)?,
            })
        })?
        .filter_map(|r| r.ok())
        .collect();
    Ok(threads)
}

// ── Create thread ──

#[derive(Debug, Deserialize)]
pub struct CreateThreadInput {
    pub id: Option<String>,
    pub title: Option<String>,
    pub project_id: Option<i64>,
}

#[tauri::command]
pub fn create_thread(
    state: State<'_, AppState>,
    input: CreateThreadInput,
) -> Result<Thread, AppError> {
    let thread_id = input
        .id
        .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());

    let db = state.db.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    db.execute(
        "INSERT INTO threads (id, user_id, project_id, title) VALUES (?1, 1, ?2, ?3)",
        rusqlite::params![thread_id, input.project_id, input.title],
    )?;

    Ok(Thread {
        id: thread_id,
        project_id: input.project_id,
        title: input.title,
        created_at: None,
        updated_at: None,
        last_message_at: None,
    })
}

// ── Update thread ──

#[derive(Debug, Deserialize)]
pub struct UpdateThreadInput {
    pub title: Option<String>,
    pub project_id: Option<serde_json::Value>, // can be number or null
}

#[tauri::command]
pub fn update_thread(
    state: State<'_, AppState>,
    thread_id: String,
    input: UpdateThreadInput,
) -> Result<(), AppError> {
    let db = state.db.lock().map_err(|e| AppError::Internal(e.to_string()))?;

    let mut sets = Vec::new();
    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    let mut idx = 1;

    if let Some(ref title) = input.title {
        sets.push(format!("title = ?{idx}"));
        params.push(Box::new(title.clone()));
        idx += 1;
    }
    if let Some(ref pid_val) = input.project_id {
        sets.push(format!("project_id = ?{idx}"));
        match pid_val {
            serde_json::Value::Null => params.push(Box::new(Option::<i64>::None)),
            serde_json::Value::Number(n) => params.push(Box::new(n.as_i64())),
            _ => params.push(Box::new(Option::<i64>::None)),
        }
        idx += 1;
    }

    if sets.is_empty() {
        return Ok(());
    }

    sets.push("updated_at = CURRENT_TIMESTAMP".into());
    let sql = format!(
        "UPDATE threads SET {} WHERE id = ?{} AND user_id = 1",
        sets.join(", "),
        idx
    );
    params.push(Box::new(thread_id));
    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    db.execute(&sql, param_refs.as_slice())?;
    Ok(())
}

// ── Delete thread ──

#[tauri::command]
pub fn delete_thread(
    state: State<'_, AppState>,
    thread_id: String,
) -> Result<(), AppError> {
    let db = state.db.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    db.execute(
        "DELETE FROM threads WHERE id = ?1 AND user_id = 1",
        rusqlite::params![thread_id],
    )?;
    Ok(())
}

// ── Get thread messages (with cursor pagination) ──

#[tauri::command]
pub fn get_thread_messages(
    state: State<'_, AppState>,
    thread_id: String,
    limit: Option<i64>,
    before_id: Option<i64>,
) -> Result<Vec<Message>, AppError> {
    let db = state.db.lock().map_err(|e| AppError::Internal(e.to_string()))?;

    // Verify thread ownership
    db.query_row(
        "SELECT 1 FROM threads WHERE id = ?1 AND user_id = 1",
        rusqlite::params![thread_id],
        |_| Ok(()),
    )
    .map_err(|_| AppError::NotFound("Thread introuvable.".into()))?;

    let lim = limit.unwrap_or(50).min(200).max(1);

    let mut messages: Vec<Message> = if let Some(bid) = before_id {
        let mut stmt = db.prepare(
            "SELECT id, role, content, attachments, provider, model, created_at
             FROM messages WHERE thread_id = ?1 AND id < ?2
             ORDER BY id DESC LIMIT ?3",
        )?;
        let rows = stmt
            .query_map(rusqlite::params![thread_id, bid, lim], |row| {
                let att_str: Option<String> = row.get(3)?;
                let attachments = att_str.and_then(|s| serde_json::from_str(&s).ok());
                Ok(Message {
                    id: row.get(0)?,
                    role: row.get(1)?,
                    content: row.get(2)?,
                    attachments,
                    provider: row.get(4)?,
                    model: row.get(5)?,
                    created_at: row.get(6)?,
                })
            })?
            .filter_map(|r| r.ok())
            .collect();
        rows
    } else {
        let mut stmt = db.prepare(
            "SELECT id, role, content, attachments, provider, model, created_at
             FROM messages WHERE thread_id = ?1
             ORDER BY id ASC LIMIT ?2",
        )?;
        let rows = stmt.query_map(rusqlite::params![thread_id, lim], |row| {
            let att_str: Option<String> = row.get(3)?;
            let attachments = att_str.and_then(|s| serde_json::from_str(&s).ok());
            Ok(Message {
                id: row.get(0)?,
                role: row.get(1)?,
                content: row.get(2)?,
                attachments,
                provider: row.get(4)?,
                model: row.get(5)?,
                created_at: row.get(6)?,
            })
        })?
        .filter_map(|r| r.ok())
        .collect();
        rows
    };

    // Reverse if paginating backwards so messages are in chronological order
    if before_id.is_some() {
        messages.reverse();
    }

    Ok(messages)
}

// ── Export thread ──

#[derive(Debug, Serialize)]
pub struct ExportResult {
    pub filename: String,
    pub content: String,
    pub mime_type: String,
}

#[tauri::command]
pub fn export_thread(
    state: State<'_, AppState>,
    thread_id: String,
    format: String,
) -> Result<ExportResult, AppError> {
    let db = state.db.lock().map_err(|e| AppError::Internal(e.to_string()))?;

    let title: String = db
        .query_row(
            "SELECT COALESCE(title, 'conversation') FROM threads WHERE id = ?1 AND user_id = 1",
            rusqlite::params![thread_id],
            |row| row.get(0),
        )
        .map_err(|_| AppError::NotFound("Thread introuvable.".into()))?;

    let mut stmt = db.prepare(
        "SELECT role, content, provider, model, created_at
         FROM messages WHERE thread_id = ?1 ORDER BY id ASC",
    )?;

    let messages: Vec<(String, String, Option<String>, Option<String>, Option<String>)> = stmt
        .query_map(rusqlite::params![thread_id], |row| {
            Ok((
                row.get(0)?,
                row.get(1)?,
                row.get(2)?,
                row.get(3)?,
                row.get(4)?,
            ))
        })?
        .filter_map(|r| r.ok())
        .collect();

    match format.as_str() {
        "md" => {
            let mut md = format!("# {title}\n\n");
            for (role, content, _provider, _model, _created_at) in &messages {
                let label = if role == "user" { "**Vous**" } else { "**Assistant**" };
                md.push_str(&format!("{label}\n\n{content}\n\n---\n\n"));
            }
            let safe_title = title.replace(['/', '\\', ':', '"'], "_");
            Ok(ExportResult {
                filename: format!("{safe_title}.md"),
                content: md,
                mime_type: "text/markdown".into(),
            })
        }
        "json" => {
            let json_messages: Vec<serde_json::Value> = messages
                .iter()
                .map(|(role, content, provider, model, created_at)| {
                    serde_json::json!({
                        "role": role,
                        "content": content,
                        "provider": provider,
                        "model": model,
                        "created_at": created_at,
                    })
                })
                .collect();
            let export = serde_json::json!({
                "title": title,
                "messages": json_messages,
            });
            let safe_title = title.replace(['/', '\\', ':', '"'], "_");
            Ok(ExportResult {
                filename: format!("{safe_title}.json"),
                content: serde_json::to_string_pretty(&export)?,
                mime_type: "application/json".into(),
            })
        }
        _ => Err(AppError::Validation(
            "Format invalide. Utilisez 'md' ou 'json'.".into(),
        )),
    }
}
