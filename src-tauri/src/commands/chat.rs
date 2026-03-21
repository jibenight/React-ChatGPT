use std::sync::Arc;

use serde::{Deserialize, Serialize};
use tauri::{ipc::Channel, State};

use crate::error::AppError;
use crate::providers::{self, ChatMessage, ProviderRequest};
use crate::state::AppState;

const MAX_MESSAGE_LEN: usize = 8000;
const MAX_ATTACHMENTS: usize = 4;
const HISTORY_LIMIT: i64 = 50;

#[derive(Debug, Deserialize, Serialize)]
pub struct Attachment {
    pub id: Option<String>,
    pub name: Option<String>,
    #[serde(rename = "mimeType")]
    pub mime_type: Option<String>,
    #[serde(rename = "dataUrl")]
    pub data_url: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SendMessageInput {
    pub thread_id: Option<String>,
    pub session_id: Option<String>,
    pub message: Option<String>,
    pub provider: String,
    pub model: String,
    pub project_id: Option<i64>,
    pub attachments: Option<Vec<Attachment>>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type")]
pub enum ChatEvent {
    #[serde(rename = "delta")]
    Delta { content: String },
    #[serde(rename = "done")]
    Done { reply: String, thread_id: String },
    #[serde(rename = "error")]
    Error { error: String },
}

#[derive(Debug, Serialize)]
pub struct SendMessageResult {
    pub reply: String,
    pub thread_id: String,
}

#[tauri::command]
pub async fn send_message(
    state: State<'_, AppState>,
    input: SendMessageInput,
    on_event: Channel<ChatEvent>,
) -> Result<SendMessageResult, AppError> {
    // Validation
    let msg = input.message.as_deref().unwrap_or("");
    let attachments = input.attachments.as_deref().unwrap_or(&[]);
    if msg.is_empty() && attachments.is_empty() {
        return Err(AppError::Validation(
            "Le message ou des pièces jointes sont requis.".into(),
        ));
    }
    if msg.len() > MAX_MESSAGE_LEN {
        return Err(AppError::Validation(format!(
            "Le message ne doit pas dépasser {MAX_MESSAGE_LEN} caractères."
        )));
    }
    if attachments.len() > MAX_ATTACHMENTS {
        return Err(AppError::Validation(format!(
            "Maximum {MAX_ATTACHMENTS} pièces jointes."
        )));
    }

    // Pour le provider local, récupérer le chemin du fichier modèle depuis la DB.
    // C5 — Rechercher uniquement par `filename`, pas par `name`.
    // Pour les autres providers, déchiffrer la clé API stockée.
    let (api_key, local_model_path) = if input.provider == "local" {
        let db = state
            .db
            .lock()
            .map_err(|e| AppError::Internal(e.to_string()))?;
        let path: String = db
            .query_row(
                "SELECT file_path FROM local_models WHERE filename = ?1",
                rusqlite::params![input.model],
                |row| row.get(0),
            )
            .map_err(|_| AppError::NotFound("Modèle local introuvable.".into()))?;
        ("local".to_string(), Some(path))
    } else {
        let key = super::user::get_decrypted_api_key(&state, &input.provider)?;
        (key, None)
    };

    // Thread ID : utiliser l'existant ou créer depuis session_id
    let thread_id = input
        .thread_id
        .clone()
        .or_else(|| input.session_id.clone())
        .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());

    // Sérialiser les pièces jointes en JSON
    let att_json = if attachments.is_empty() {
        None
    } else {
        Some(serde_json::to_string(attachments)?)
    };

    // Opérations base de données (synchrones, sous mutex)
    let (system_prompt, history) = {
        let db = state
            .db
            .lock()
            .map_err(|e| AppError::Internal(e.to_string()))?;

        // S'assurer que le thread existe
        let thread_exists: bool = db
            .query_row(
                "SELECT 1 FROM threads WHERE id = ?1",
                rusqlite::params![thread_id],
                |_| Ok(true),
            )
            .unwrap_or(false);

        if !thread_exists {
            db.execute(
                "INSERT INTO threads (id, user_id, project_id, title, last_message_at)
                 VALUES (?1, 1, ?2, NULL, CURRENT_TIMESTAMP)",
                rusqlite::params![thread_id, input.project_id],
            )?;
        } else if input.project_id.is_some() {
            // Assigner le projet s'il n'est pas encore défini
            db.execute(
                "UPDATE threads SET project_id = ?1
                 WHERE id = ?2 AND user_id = 1 AND project_id IS NULL",
                rusqlite::params![input.project_id, thread_id],
            )?;
        }

        // Stocker le message utilisateur
        db.execute(
            "INSERT INTO messages (thread_id, role, content, attachments, provider, model)
             VALUES (?1, 'user', ?2, ?3, ?4, ?5)",
            rusqlite::params![thread_id, msg, att_json, input.provider, input.model],
        )?;

        // Construire le system prompt depuis le contexte du projet
        let system_prompt: Option<String> = if let Some(pid) = input.project_id {
            let result: Result<(Option<String>, Option<String>), _> = db.query_row(
                "SELECT instructions, context_data FROM projects WHERE id = ?1 AND user_id = 1",
                rusqlite::params![pid],
                |row| Ok((row.get(0)?, row.get(1)?)),
            );
            if let Ok((inst, ctx)) = result {
                let mut prompt = String::new();
                if let Some(i) = inst {
                    if !i.is_empty() {
                        prompt.push_str("Project instructions:\n");
                        prompt.push_str(&i);
                    }
                }
                if let Some(c) = ctx {
                    if !c.is_empty() {
                        if !prompt.is_empty() {
                            prompt.push_str("\n\n");
                        }
                        prompt.push_str("Project context:\n");
                        prompt.push_str(&c);
                    }
                }
                if prompt.is_empty() { None } else { Some(prompt) }
            } else {
                None
            }
        } else {
            None
        };

        // Charger l'historique de conversation
        let mut stmt = db.prepare(
            "SELECT role, content FROM messages
             WHERE thread_id = ?1 ORDER BY id DESC LIMIT ?2",
        )?;
        let mut history: Vec<ChatMessage> = stmt
            .query_map(rusqlite::params![thread_id, HISTORY_LIMIT], |row| {
                Ok(ChatMessage {
                    role: row.get(0)?,
                    content: row.get(1)?,
                })
            })?
            .filter_map(|r| r.ok())
            .collect();
        history.reverse();

        (system_prompt, history)
    };

    // Appeler le provider IA
    let provider_req = ProviderRequest {
        api_key,
        model: input.model.clone(),
        messages: history,
        system_prompt,
    };

    let reply = if let Some(model_path) = local_model_path {
        // C4 — Vérifier que le fichier modèle existe toujours avant l'inférence
        if !std::path::Path::new(&model_path).exists() {
            return Err(AppError::NotFound("Le fichier modèle a été supprimé.".into()));
        }

        // W1 — Obtenir ou charger le modèle depuis le cache
        let model = {
            let mut cache = state
                .loaded_model
                .lock()
                .map_err(|e| AppError::Internal(e.to_string()))?;

            if let Some((cached_path, cached_model)) = cache.as_ref() {
                if cached_path == &model_path {
                    // Cache hit : réutiliser le modèle existant
                    Arc::clone(cached_model)
                } else {
                    // Cache miss : charger un nouveau modèle
                    let model_params = llama_cpp_2::model::params::LlamaModelParams::default();
                    let new_model = Arc::new(
                        llama_cpp_2::model::LlamaModel::load_from_file(
                            &state.llama_backend,
                            std::path::Path::new(&model_path),
                            &model_params,
                        )
                        .map_err(|e| AppError::Provider(format!("Impossible de charger le modèle: {e}")))?,
                    );
                    *cache = Some((model_path.clone(), Arc::clone(&new_model)));
                    new_model
                }
            } else {
                // Cache vide : charger le modèle pour la première fois
                let model_params = llama_cpp_2::model::params::LlamaModelParams::default();
                let new_model = Arc::new(
                    llama_cpp_2::model::LlamaModel::load_from_file(
                        &state.llama_backend,
                        std::path::Path::new(&model_path),
                        &model_params,
                    )
                    .map_err(|e| AppError::Provider(format!("Impossible de charger le modèle: {e}")))?,
                );
                *cache = Some((model_path.clone(), Arc::clone(&new_model)));
                new_model
            }
        };

        // L'inférence GGUF locale est synchrone — l'exécuter sur un thread pool bloquant
        // pour ne pas affamer le runtime async.
        let channel = on_event.clone();
        let req_clone = provider_req.clone();
        let backend = Arc::clone(&state.llama_backend);
        tokio::task::spawn_blocking(move || {
            providers::local::send_blocking(&backend, &model, &req_clone, move |delta| {
                let _ = channel.send(ChatEvent::Delta { content: delta });
            })
        })
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?
    } else {
        let channel = on_event.clone();
        providers::route_to_provider(&input.provider, provider_req, move |delta| {
            let _ = channel.send(ChatEvent::Delta { content: delta });
        })
        .await
    };

    let reply = match reply {
        Ok(r) => r,
        Err(e) => {
            let error_msg = e.to_string();
            let _ = on_event.send(ChatEvent::Error {
                error: error_msg.clone(),
            });
            return Err(e);
        }
    };

    // Stocker la réponse de l'assistant
    {
        let db = state
            .db
            .lock()
            .map_err(|e| AppError::Internal(e.to_string()))?;
        db.execute(
            "INSERT INTO messages (thread_id, role, content, provider, model)
             VALUES (?1, 'assistant', ?2, ?3, ?4)",
            rusqlite::params![thread_id, reply, input.provider, input.model],
        )?;
        db.execute(
            "UPDATE threads SET last_message_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP WHERE id = ?1",
            rusqlite::params![thread_id],
        )?;
    }

    let _ = on_event.send(ChatEvent::Done {
        reply: reply.clone(),
        thread_id: thread_id.clone(),
    });

    Ok(SendMessageResult {
        reply,
        thread_id,
    })
}
