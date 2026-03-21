mod commands;
mod crypto;
mod db;
mod error;
mod providers;
mod state;

use std::sync::{Arc, Mutex};

use llama_cpp_2::llama_backend::LlamaBackend;
use rusqlite::Connection;

use state::AppState;

/// Derive a stable encryption key from the machine's hostname.
/// This is deterministic so the same machine always gets the same key.
fn derive_encryption_key() -> String {
    let hostname = std::process::Command::new("hostname")
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .unwrap_or_else(|_| "react-chatgpt-desktop".into());
    format!("rcd-{hostname}-aes256gcm-local")
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_biometry::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|_app| {
            Ok(())
        })
        .manage({
            let db_path = db::db_path();
            let conn = Connection::open(&db_path)
                .expect("Failed to open SQLite database");
            db::initialize(&conn).expect("Failed to initialize database schema");

            // LlamaBackend is a process-global singleton.
            // Wrapping in Arc lets spawn_blocking closures hold a reference.
            let llama_backend = Arc::new(
                LlamaBackend::init().expect("Failed to initialize LlamaBackend"),
            );

            AppState {
                db: Mutex::new(conn),
                encryption_key: derive_encryption_key(),
                llama_backend,
                loaded_model: Mutex::new(None),
            }
        })
        .invoke_handler(tauri::generate_handler![
            // User
            commands::user::get_user,
            commands::user::update_username,
            commands::user::save_api_key,
            commands::user::list_api_keys,
            commands::user::delete_api_key,
            // Projects
            commands::project::list_projects,
            commands::project::get_project,
            commands::project::create_project,
            commands::project::update_project,
            commands::project::delete_project,
            // Threads
            commands::thread::list_threads,
            commands::thread::create_thread,
            commands::thread::update_thread,
            commands::thread::delete_thread,
            commands::thread::get_thread_messages,
            commands::thread::export_thread,
            // Chat
            commands::chat::send_message,
            // Search
            commands::search::search_messages,
            // Local models
            commands::local_model::import_model,
            commands::local_model::list_local_models,
            commands::local_model::delete_local_model,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
