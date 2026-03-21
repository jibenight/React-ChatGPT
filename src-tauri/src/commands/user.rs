use serde::{Deserialize, Serialize};
use tauri::State;

use crate::crypto;
use crate::error::AppError;
use crate::state::AppState;

#[derive(Debug, Serialize)]
pub struct User {
    pub id: i64,
    pub username: String,
    pub email: String,
}

#[tauri::command]
pub fn get_user(state: State<'_, AppState>) -> Result<User, AppError> {
    let db = state.db.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    let mut stmt = db.prepare("SELECT id, username, email FROM users WHERE id = 1")?;
    let user = stmt.query_row([], |row| {
        Ok(User {
            id: row.get(0)?,
            username: row.get(1)?,
            email: row.get(2)?,
        })
    })?;
    Ok(user)
}

#[derive(Debug, Deserialize)]
pub struct UpdateUsernameInput {
    pub username: String,
}

#[tauri::command]
pub fn update_username(
    state: State<'_, AppState>,
    input: UpdateUsernameInput,
) -> Result<(), AppError> {
    if input.username.is_empty() || input.username.len() > 100 {
        return Err(AppError::Validation(
            "Le nom doit contenir entre 1 et 100 caractères.".into(),
        ));
    }
    let db = state.db.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    db.execute(
        "UPDATE users SET username = ?1 WHERE id = 1",
        rusqlite::params![input.username],
    )?;
    Ok(())
}

#[derive(Debug, Deserialize)]
pub struct SaveApiKeyInput {
    pub provider: String,
    pub api_key: String,
}

const SUPPORTED_PROVIDERS: &[&str] = &["openai", "gemini", "claude", "mistral", "groq"];

#[tauri::command]
pub fn save_api_key(
    state: State<'_, AppState>,
    input: SaveApiKeyInput,
) -> Result<(), AppError> {
    if !SUPPORTED_PROVIDERS.contains(&input.provider.as_str()) {
        return Err(AppError::Validation(format!(
            "Provider invalide : {}",
            input.provider
        )));
    }
    if input.api_key.is_empty() || input.api_key.len() > 500 {
        return Err(AppError::Validation(
            "La clé API doit contenir entre 1 et 500 caractères.".into(),
        ));
    }

    let encrypted = crypto::encrypt(&input.api_key, &state.encryption_key)?;
    let db = state.db.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    db.execute(
        "INSERT INTO api_keys (user_id, provider, api_key) VALUES (1, ?1, ?2)
         ON CONFLICT (user_id, provider) DO UPDATE SET api_key = excluded.api_key",
        rusqlite::params![input.provider, encrypted],
    )?;
    Ok(())
}

#[derive(Debug, Serialize)]
pub struct ApiKeysResult {
    pub providers: Vec<String>,
}

#[tauri::command]
pub fn list_api_keys(state: State<'_, AppState>) -> Result<ApiKeysResult, AppError> {
    let db = state.db.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    let mut stmt = db.prepare("SELECT provider FROM api_keys WHERE user_id = 1")?;
    let providers = stmt
        .query_map([], |row| row.get::<_, String>(0))?
        .filter_map(|r| r.ok())
        .collect();
    Ok(ApiKeysResult { providers })
}

#[tauri::command]
pub fn delete_api_key(
    state: State<'_, AppState>,
    provider: String,
) -> Result<(), AppError> {
    let db = state.db.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    db.execute(
        "DELETE FROM api_keys WHERE user_id = 1 AND provider = ?1",
        rusqlite::params![provider],
    )?;
    Ok(())
}

/// Decrypt an API key for a given provider (internal use by chat command).
pub fn get_decrypted_api_key(
    state: &AppState,
    provider: &str,
) -> Result<String, AppError> {
    let db = state.db.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    let encrypted: String = db
        .query_row(
            "SELECT api_key FROM api_keys WHERE user_id = 1 AND provider = ?1",
            rusqlite::params![provider],
            |row| row.get(0),
        )
        .map_err(|_| {
            AppError::NotFound(format!(
                "Aucune clé API configurée pour {provider}. Ajoutez-la dans les paramètres."
            ))
        })?;
    crypto::decrypt(&encrypted, &state.encryption_key)
}
