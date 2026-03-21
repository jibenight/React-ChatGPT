use serde::Serialize;
use tauri::State;

use crate::error::AppError;
use crate::state::AppState;

#[derive(Debug, Serialize)]
pub struct SearchResult {
    pub id: i64,
    pub thread_id: String,
    pub thread_title: Option<String>,
    pub role: String,
    pub content: String,
    pub provider: Option<String>,
    pub created_at: Option<String>,
    pub snippet: String,
}

#[derive(Debug, Serialize)]
pub struct SearchResponse {
    pub results: Vec<SearchResult>,
    pub total: i64,
}

#[tauri::command]
pub fn search_messages(
    state: State<'_, AppState>,
    query: String,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<SearchResponse, AppError> {
    if query.len() < 2 {
        return Err(AppError::Validation(
            "La recherche doit contenir au moins 2 caractères.".into(),
        ));
    }

    let lim = limit.unwrap_or(20).min(50).max(1);
    let off = offset.unwrap_or(0).max(0);

    let db = state.db.lock().map_err(|e| AppError::Internal(e.to_string()))?;

    let total: i64 = db.query_row(
        "SELECT COUNT(*) FROM messages m
         JOIN messages_fts fts ON m.id = fts.rowid
         WHERE messages_fts MATCH ?1
           AND m.thread_id IN (SELECT id FROM threads WHERE user_id = 1)",
        rusqlite::params![query],
        |row| row.get(0),
    )?;

    let mut stmt = db.prepare(
        "SELECT m.id, m.thread_id, t.title AS thread_title, m.role, m.content,
                m.provider, m.created_at,
                snippet(messages_fts, 0, '<mark>', '</mark>', '...', 40) AS snippet
         FROM messages m
         JOIN messages_fts fts ON m.id = fts.rowid
         JOIN threads t ON m.thread_id = t.id
         WHERE messages_fts MATCH ?1
           AND t.user_id = 1
         ORDER BY m.created_at DESC
         LIMIT ?2 OFFSET ?3",
    )?;

    let results = stmt
        .query_map(rusqlite::params![query, lim, off], |row| {
            Ok(SearchResult {
                id: row.get(0)?,
                thread_id: row.get(1)?,
                thread_title: row.get(2)?,
                role: row.get(3)?,
                content: row.get(4)?,
                provider: row.get(5)?,
                created_at: row.get(6)?,
                snippet: row.get(7)?,
            })
        })?
        .filter_map(|r| r.ok())
        .collect();

    Ok(SearchResponse { results, total })
}
