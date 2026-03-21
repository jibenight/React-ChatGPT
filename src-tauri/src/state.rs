use std::sync::{Arc, Mutex};

use llama_cpp_2::llama_backend::LlamaBackend;
use llama_cpp_2::model::LlamaModel;
use rusqlite::Connection;

pub struct AppState {
    pub db: Mutex<Connection>,
    pub encryption_key: String,
    /// Shared reference so it can be cheaply cloned into `spawn_blocking` closures.
    pub llama_backend: Arc<LlamaBackend>,
    /// Cache du modèle GGUF chargé : (chemin_fichier, modèle).
    /// Évite de recharger le même modèle à chaque message.
    pub loaded_model: Mutex<Option<(String, Arc<LlamaModel>)>>,
}
