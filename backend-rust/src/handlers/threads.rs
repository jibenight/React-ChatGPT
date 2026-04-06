use crate::{
    db::DbPool,
    dto::threads::{
        CreateThreadRequest, ExportThreadQuery, ProjectThreadsParam, ThreadIdParam,
        ThreadMessagesQuery, UpdateThreadRequest,
    },
    error::AppError,
    extractors::{AuthUser, ValidatedJson, ValidatedPath, ValidatedQuery},
    state::AppState,
};
use axum::{
    extract::State,
    http::header,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use uuid::Uuid;

pub async fn list_threads(
    State(state): State<AppState>,
    auth: AuthUser,
) -> Result<impl IntoResponse, AppError> {
    #[derive(sqlx::FromRow, serde::Serialize)]
    struct ThreadRow {
        id: String,
        project_id: Option<i64>,
        title: Option<String>,
        created_at: String,
        updated_at: String,
        last_message_at: Option<String>,
    }

    let rows: Vec<ThreadRow> = match &state.db {
        DbPool::Sqlite(pool) => {
            sqlx::query_as::<_, ThreadRow>(
                "SELECT id, project_id, title, created_at, updated_at, last_message_at
                 FROM threads WHERE user_id = ?
                 ORDER BY last_message_at DESC, updated_at DESC",
            )
            .bind(auth.id)
            .fetch_all(pool)
            .await?
        }
        DbPool::Postgres(pool) => {
            sqlx::query_as::<_, ThreadRow>(
                "SELECT id, project_id, title, created_at, updated_at, last_message_at
                 FROM threads WHERE user_id = $1
                 ORDER BY last_message_at DESC, updated_at DESC",
            )
            .bind(auth.id)
            .fetch_all(pool)
            .await?
        }
    };

    Ok(Json(rows))
}

pub async fn list_project_threads(
    State(state): State<AppState>,
    auth: AuthUser,
    ValidatedPath(params): ValidatedPath<ProjectThreadsParam>,
) -> Result<impl IntoResponse, AppError> {
    #[derive(sqlx::FromRow, serde::Serialize)]
    struct ThreadRow {
        id: String,
        title: Option<String>,
        created_at: String,
        updated_at: String,
        last_message_at: Option<String>,
    }

    let rows: Vec<ThreadRow> = match &state.db {
        DbPool::Sqlite(pool) => {
            sqlx::query_as::<_, ThreadRow>(
                "SELECT id, title, created_at, updated_at, last_message_at
                 FROM threads WHERE user_id = ? AND project_id = ?
                 ORDER BY last_message_at DESC, updated_at DESC",
            )
            .bind(auth.id)
            .bind(params.project_id)
            .fetch_all(pool)
            .await?
        }
        DbPool::Postgres(pool) => {
            sqlx::query_as::<_, ThreadRow>(
                "SELECT id, title, created_at, updated_at, last_message_at
                 FROM threads WHERE user_id = $1 AND project_id = $2
                 ORDER BY last_message_at DESC, updated_at DESC",
            )
            .bind(auth.id)
            .bind(params.project_id)
            .fetch_all(pool)
            .await?
        }
    };

    Ok(Json(rows))
}

pub async fn create_thread(
    State(state): State<AppState>,
    auth: AuthUser,
    ValidatedJson(body): ValidatedJson<CreateThreadRequest>,
) -> Result<impl IntoResponse, AppError> {
    let thread_id = body
        .id
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| Uuid::new_v4().to_string());
    let title = body.title.filter(|s| !s.is_empty());
    let project_id = body.project_id;

    match &state.db {
        DbPool::Sqlite(pool) => {
            sqlx::query(
                "INSERT INTO threads (id, user_id, project_id, title) VALUES (?, ?, ?, ?)",
            )
            .bind(&thread_id)
            .bind(auth.id)
            .bind(project_id)
            .bind(&title)
            .execute(pool)
            .await?;
        }
        DbPool::Postgres(pool) => {
            sqlx::query(
                "INSERT INTO threads (id, user_id, project_id, title) VALUES ($1, $2, $3, $4)",
            )
            .bind(&thread_id)
            .bind(auth.id)
            .bind(project_id)
            .bind(&title)
            .execute(pool)
            .await?;
        }
    }

    Ok((
        axum::http::StatusCode::CREATED,
        Json(json!({ "id": thread_id, "title": title })),
    ))
}

pub async fn create_project_thread(
    State(state): State<AppState>,
    auth: AuthUser,
    ValidatedPath(params): ValidatedPath<ProjectThreadsParam>,
    ValidatedJson(body): ValidatedJson<CreateThreadRequest>,
) -> Result<impl IntoResponse, AppError> {
    let thread_id = body
        .id
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| Uuid::new_v4().to_string());
    let title = body.title.filter(|s| !s.is_empty());

    match &state.db {
        DbPool::Sqlite(pool) => {
            sqlx::query(
                "INSERT INTO threads (id, user_id, project_id, title) VALUES (?, ?, ?, ?)",
            )
            .bind(&thread_id)
            .bind(auth.id)
            .bind(params.project_id)
            .bind(&title)
            .execute(pool)
            .await?;
        }
        DbPool::Postgres(pool) => {
            sqlx::query(
                "INSERT INTO threads (id, user_id, project_id, title) VALUES ($1, $2, $3, $4)",
            )
            .bind(&thread_id)
            .bind(auth.id)
            .bind(params.project_id)
            .bind(&title)
            .execute(pool)
            .await?;
        }
    }

    Ok((
        axum::http::StatusCode::CREATED,
        Json(json!({ "id": thread_id, "title": title })),
    ))
}

pub async fn get_thread_messages(
    State(state): State<AppState>,
    auth: AuthUser,
    ValidatedPath(params): ValidatedPath<ThreadIdParam>,
    ValidatedQuery(query): ValidatedQuery<ThreadMessagesQuery>,
) -> Result<impl IntoResponse, AppError> {
    let limit = query.limit.unwrap_or(50).min(200);
    let before_id = query.before_id;

    // Verify ownership
    let thread_exists = match &state.db {
        DbPool::Sqlite(pool) => {
            sqlx::query_as::<_, (String,)>(
                "SELECT id FROM threads WHERE id = ? AND user_id = ? LIMIT 1",
            )
            .bind(&params.thread_id)
            .bind(auth.id)
            .fetch_optional(pool)
            .await?
            .is_some()
        }
        DbPool::Postgres(pool) => {
            sqlx::query_as::<_, (String,)>(
                "SELECT id FROM threads WHERE id = $1 AND user_id = $2 LIMIT 1",
            )
            .bind(&params.thread_id)
            .bind(auth.id)
            .fetch_optional(pool)
            .await?
            .is_some()
        }
    };

    if !thread_exists {
        return Err(AppError::NotFound("Thread not found".to_string()));
    }

    #[derive(sqlx::FromRow, serde::Serialize)]
    struct MsgRow {
        id: i64,
        role: String,
        content: String,
        attachments: Option<String>,
        provider: Option<String>,
        model: Option<String>,
        created_at: String,
    }

    let (rows, use_before_id) = match &state.db {
        DbPool::Sqlite(pool) => {
            if let Some(bid) = before_id {
                let r = sqlx::query_as::<_, MsgRow>(
                    "SELECT id, role, content, attachments, provider, model, created_at
                     FROM messages WHERE thread_id = ? AND id < ?
                     ORDER BY id DESC LIMIT ?",
                )
                .bind(&params.thread_id)
                .bind(bid)
                .bind(limit)
                .fetch_all(pool)
                .await?;
                (r, true)
            } else {
                let r = sqlx::query_as::<_, MsgRow>(
                    "SELECT id, role, content, attachments, provider, model, created_at
                     FROM messages WHERE thread_id = ?
                     ORDER BY id ASC LIMIT ?",
                )
                .bind(&params.thread_id)
                .bind(limit)
                .fetch_all(pool)
                .await?;
                (r, false)
            }
        }
        DbPool::Postgres(pool) => {
            if let Some(bid) = before_id {
                let r = sqlx::query_as::<_, MsgRow>(
                    "SELECT id, role, content, attachments, provider, model, created_at
                     FROM messages WHERE thread_id = $1 AND id < $2
                     ORDER BY id DESC LIMIT $3",
                )
                .bind(&params.thread_id)
                .bind(bid)
                .bind(limit)
                .fetch_all(pool)
                .await?;
                (r, true)
            } else {
                let r = sqlx::query_as::<_, MsgRow>(
                    "SELECT id, role, content, attachments, provider, model, created_at
                     FROM messages WHERE thread_id = $1
                     ORDER BY id ASC LIMIT $2",
                )
                .bind(&params.thread_id)
                .bind(limit)
                .fetch_all(pool)
                .await?;
                (r, false)
            }
        }
    };

    let mut rows = rows;
    if use_before_id {
        rows.reverse();
    }

    // Parse attachments JSON
    let with_attachments: Vec<serde_json::Value> = rows
        .into_iter()
        .map(|r| {
            let attachments: Vec<serde_json::Value> = r
                .attachments
                .as_deref()
                .and_then(|s| serde_json::from_str(s).ok())
                .filter(|v: &serde_json::Value| v.is_array())
                .and_then(|v| v.as_array().cloned())
                .unwrap_or_default();

            json!({
                "id": r.id,
                "role": r.role,
                "content": r.content,
                "attachments": attachments,
                "provider": r.provider,
                "model": r.model,
                "created_at": r.created_at,
            })
        })
        .collect();

    Ok(Json(with_attachments))
}

pub async fn update_thread(
    State(state): State<AppState>,
    auth: AuthUser,
    ValidatedPath(params): ValidatedPath<ThreadIdParam>,
    ValidatedJson(body): ValidatedJson<UpdateThreadRequest>,
) -> Result<impl IntoResponse, AppError> {
    let has_title = body.title.is_some();
    let has_project_id = body.project_id.is_some();

    if !has_title && !has_project_id {
        return Err(AppError::BadRequest("Nothing to update".to_string()));
    }

    #[derive(sqlx::FromRow)]
    struct ThreadRow {
        title: Option<String>,
        project_id: Option<i64>,
    }

    let thread: Option<ThreadRow> = match &state.db {
        DbPool::Sqlite(pool) => {
            sqlx::query_as::<_, ThreadRow>(
                "SELECT title, project_id FROM threads WHERE id = ? AND user_id = ?",
            )
            .bind(&params.thread_id)
            .bind(auth.id)
            .fetch_optional(pool)
            .await?
        }
        DbPool::Postgres(pool) => {
            sqlx::query_as::<_, ThreadRow>(
                "SELECT title, project_id FROM threads WHERE id = $1 AND user_id = $2",
            )
            .bind(&params.thread_id)
            .bind(auth.id)
            .fetch_optional(pool)
            .await?
        }
    };

    let thread = match thread {
        Some(t) => t,
        None => return Err(AppError::NotFound("Thread not found".to_string())),
    };

    // Parse title: null JSON -> null, string -> trimmed string
    let next_title: Option<Option<String>> = if has_title {
        let v = body.title.as_ref().unwrap();
        if v.is_null() {
            Some(None)
        } else if let Some(s) = v.as_str() {
            let trimmed = s.trim();
            Some(if trimmed.is_empty() { None } else { Some(trimmed.to_string()) })
        } else {
            Some(None)
        }
    } else {
        None
    };

    // Parse project_id: null JSON -> null
    let next_project_id: Option<Option<i64>> = if has_project_id {
        let v = body.project_id.as_ref().unwrap();
        if v.is_null() {
            Some(None)
        } else {
            Some(v.as_i64())
        }
    } else {
        None
    };

    let updated_title = next_title.unwrap_or(thread.title);
    let updated_project_id = next_project_id.unwrap_or(thread.project_id);

    match &state.db {
        DbPool::Sqlite(pool) => {
            sqlx::query(
                "UPDATE threads SET title = ?, project_id = ?, updated_at = CURRENT_TIMESTAMP
                 WHERE id = ? AND user_id = ?",
            )
            .bind(&updated_title)
            .bind(updated_project_id)
            .bind(&params.thread_id)
            .bind(auth.id)
            .execute(pool)
            .await?;
        }
        DbPool::Postgres(pool) => {
            sqlx::query(
                "UPDATE threads SET title = $1, project_id = $2, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $3 AND user_id = $4",
            )
            .bind(&updated_title)
            .bind(updated_project_id)
            .bind(&params.thread_id)
            .bind(auth.id)
            .execute(pool)
            .await?;
        }
    }

    Ok(Json(json!({
        "id": params.thread_id,
        "title": updated_title,
        "project_id": updated_project_id,
    })))
}

pub async fn delete_thread(
    State(state): State<AppState>,
    auth: AuthUser,
    ValidatedPath(params): ValidatedPath<ThreadIdParam>,
) -> Result<impl IntoResponse, AppError> {
    let result = match &state.db {
        DbPool::Sqlite(pool) => {
            sqlx::query("DELETE FROM threads WHERE id = ? AND user_id = ?")
                .bind(&params.thread_id)
                .bind(auth.id)
                .execute(pool)
                .await?
                .rows_affected()
        }
        DbPool::Postgres(pool) => {
            sqlx::query("DELETE FROM threads WHERE id = $1 AND user_id = $2")
                .bind(&params.thread_id)
                .bind(auth.id)
                .execute(pool)
                .await?
                .rows_affected()
        }
    };

    if result == 0 {
        return Err(AppError::NotFound("Thread not found".to_string()));
    }

    Ok(Json(json!({ "message": "Thread deleted" })))
}

pub async fn export_thread(
    State(state): State<AppState>,
    auth: AuthUser,
    ValidatedPath(params): ValidatedPath<ThreadIdParam>,
    ValidatedQuery(query): ValidatedQuery<ExportThreadQuery>,
) -> Result<Response, AppError> {
    #[derive(sqlx::FromRow)]
    struct ThreadRow {
        title: Option<String>,
        created_at: String,
    }

    let thread: Option<ThreadRow> = match &state.db {
        DbPool::Sqlite(pool) => {
            sqlx::query_as::<_, ThreadRow>(
                "SELECT title, created_at FROM threads WHERE id = ? AND user_id = ?",
            )
            .bind(&params.thread_id)
            .bind(auth.id)
            .fetch_optional(pool)
            .await?
        }
        DbPool::Postgres(pool) => {
            sqlx::query_as::<_, ThreadRow>(
                "SELECT title, created_at FROM threads WHERE id = $1 AND user_id = $2",
            )
            .bind(&params.thread_id)
            .bind(auth.id)
            .fetch_optional(pool)
            .await?
        }
    };

    let thread = match thread {
        Some(t) => t,
        None => return Err(AppError::NotFound("Thread not found".to_string())),
    };

    #[derive(sqlx::FromRow)]
    struct MsgRow {
        role: String,
        content: String,
        provider: Option<String>,
        model: Option<String>,
        created_at: String,
    }

    let messages: Vec<MsgRow> = match &state.db {
        DbPool::Sqlite(pool) => {
            sqlx::query_as::<_, MsgRow>(
                "SELECT role, content, provider, model, created_at
                 FROM messages WHERE thread_id = ? ORDER BY id ASC",
            )
            .bind(&params.thread_id)
            .fetch_all(pool)
            .await?
        }
        DbPool::Postgres(pool) => {
            sqlx::query_as::<_, MsgRow>(
                "SELECT role, content, provider, model, created_at
                 FROM messages WHERE thread_id = $1 ORDER BY id ASC",
            )
            .bind(&params.thread_id)
            .fetch_all(pool)
            .await?
        }
    };

    let title = thread.title.as_deref().unwrap_or("conversation");
    let safe_title: String = title
        .chars()
        .filter(|c| c.is_alphanumeric() || " _-".contains(*c))
        .take(80)
        .collect();

    let format = query.format.as_deref().unwrap_or("json");

    if format == "md" {
        let mut lines: Vec<String> = vec![format!("# {}\n", title)];
        for msg in &messages {
            let role_label = match msg.role.as_str() {
                "user" => "Utilisateur",
                "assistant" => "Assistant",
                other => other,
            };
            lines.push(format!("**{}**\n", role_label));
            lines.push(format!("{}\n", msg.content));
            lines.push("---\n".to_string());
        }
        let markdown = lines.join("\n");
        let filename = format!("thread-{}.md", safe_title);

        return Ok((
            [
                (header::CONTENT_TYPE, "text/markdown; charset=utf-8"),
                (
                    header::CONTENT_DISPOSITION,
                    &format!("attachment; filename=\"{}\"", filename) as &str,
                ),
            ],
            markdown,
        )
            .into_response());
    }

    // Default: JSON export
    let payload = json!({
        "title": title,
        "created_at": thread.created_at,
        "messages": messages.iter().map(|m| json!({
            "role": m.role,
            "content": m.content,
            "provider": m.provider,
            "model": m.model,
            "created_at": m.created_at,
        })).collect::<Vec<_>>(),
    });

    let filename = format!("thread-{}.json", safe_title);

    Ok((
        [
            (header::CONTENT_TYPE, "application/json; charset=utf-8"),
            (
                header::CONTENT_DISPOSITION,
                &format!("attachment; filename=\"{}\"", filename) as &str,
            ),
        ],
        Json(payload),
    )
        .into_response())
}
