use serde::{Deserialize, Serialize};
use tauri::State;

use crate::error::AppError;
use crate::state::AppState;

#[derive(Debug, Serialize)]
pub struct LocalModel {
    pub id: i64,
    pub name: String,
    pub filename: String,
    pub file_path: String,
    pub size_bytes: i64,
    pub imported_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ImportModelInput {
    pub path: String,
}

const MAX_MODEL_SIZE: u64 = 50 * 1024 * 1024 * 1024; // 50 Go

#[tauri::command]
pub async fn import_model(
    state: State<'_, AppState>,
    input: ImportModelInput,
) -> Result<LocalModel, AppError> {
    // 1. Canonicaliser le chemin source pour prévenir le path traversal (C1)
    let source = std::fs::canonicalize(std::path::Path::new(&input.path))
        .map_err(|e| AppError::Validation(format!("Chemin invalide: {e}")))?;

    if source.extension().and_then(|e| e.to_str()) != Some("gguf") {
        return Err(AppError::Validation(
            "Seuls les fichiers .gguf sont acceptés.".into(),
        ));
    }

    // Vérifier que le chemin ne pointe pas vers un emplacement sensible (C1)
    let source_str = source.to_string_lossy();
    if source_str.contains("/etc/")
        || source_str.contains("/sys/")
        || source_str.contains("/proc/")
        || source_str.contains("/../")
    {
        return Err(AppError::Validation(
            "Chemin non autorisé.".into(),
        ));
    }

    // 2. Récupérer les métadonnées du fichier
    let metadata = tokio::fs::metadata(&source)
        .await
        .map_err(|e| AppError::Internal(format!("Impossible de lire le fichier: {e}")))?;

    // W4 — Validation de taille de fichier
    if metadata.len() > MAX_MODEL_SIZE {
        return Err(AppError::Validation(
            "Le fichier dépasse la taille maximale autorisée (50 Go).".into(),
        ));
    }

    let size_bytes = metadata.len() as i64;
    let filename = source
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();

    // 3. Dériver le nom d'affichage à partir du nom de fichier (sans l'extension .gguf)
    let name = filename
        .strip_suffix(".gguf")
        .unwrap_or(&filename)
        .to_string();

    // 4. Copier le fichier dans le dossier modèles de l'application
    let models_dir = crate::db::db_path()
        .parent()
        .unwrap_or_else(|| std::path::Path::new("."))
        .join("models");
    tokio::fs::create_dir_all(&models_dir)
        .await
        .map_err(|e| AppError::Internal(format!("Impossible de créer le dossier modèles: {e}")))?;
    let dest = models_dir.join(&filename);

    if dest.exists() {
        return Err(AppError::Validation(
            "Un modèle avec ce nom existe déjà.".into(),
        ));
    }

    // W2 — Copie asynchrone pour ne pas bloquer le runtime
    tokio::fs::copy(&source, &dest)
        .await
        .map_err(|e| AppError::Internal(format!("Impossible de copier le modèle: {e}")))?;

    // 5. Insérer en base de données (sync sous mutex)
    let db = state
        .db
        .lock()
        .map_err(|e| AppError::Internal(e.to_string()))?;
    db.execute(
        "INSERT INTO local_models (name, filename, file_path, size_bytes) VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![name, filename, dest.to_string_lossy().to_string(), size_bytes],
    )?;

    let id = db.last_insert_rowid();

    Ok(LocalModel {
        id,
        name,
        filename,
        file_path: dest.to_string_lossy().to_string(),
        size_bytes,
        imported_at: None,
    })
}

#[tauri::command]
pub fn list_local_models(state: State<'_, AppState>) -> Result<Vec<LocalModel>, AppError> {
    let db = state
        .db
        .lock()
        .map_err(|e| AppError::Internal(e.to_string()))?;
    let mut stmt = db.prepare(
        "SELECT id, name, filename, file_path, size_bytes, imported_at
         FROM local_models ORDER BY imported_at DESC",
    )?;
    let models = stmt
        .query_map([], |row| {
            Ok(LocalModel {
                id: row.get(0)?,
                name: row.get(1)?,
                filename: row.get(2)?,
                file_path: row.get(3)?,
                size_bytes: row.get(4)?,
                imported_at: row.get(5)?,
            })
        })?
        .filter_map(|r| r.ok())
        .collect();
    Ok(models)
}

#[tauri::command]
pub fn delete_local_model(
    state: State<'_, AppState>,
    model_id: i64,
) -> Result<(), AppError> {
    let db = state
        .db
        .lock()
        .map_err(|e| AppError::Internal(e.to_string()))?;

    // Récupérer le chemin du fichier avant de supprimer la ligne
    let file_path: String = db
        .query_row(
            "SELECT file_path FROM local_models WHERE id = ?1",
            rusqlite::params![model_id],
            |row| row.get(0),
        )
        .map_err(|_| AppError::NotFound("Modèle introuvable.".into()))?;

    // Supprimer l'entrée en base de données
    db.execute(
        "DELETE FROM local_models WHERE id = ?1",
        rusqlite::params![model_id],
    )?;

    // C3 — Logger l'erreur en cas d'échec de suppression du fichier
    if let Err(e) = std::fs::remove_file(&file_path) {
        log::warn!("Impossible de supprimer le fichier modèle {file_path}: {e}");
    }

    // W1 — Invalider le cache si le modèle supprimé était celui en mémoire
    let mut cache = state
        .loaded_model
        .lock()
        .map_err(|e| AppError::Internal(e.to_string()))?;
    if let Some((cached_path, _)) = cache.as_ref() {
        if cached_path == &file_path {
            *cache = None;
        }
    }

    Ok(())
}
