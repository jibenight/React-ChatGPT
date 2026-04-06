#![allow(dead_code, unused_imports)]

mod app;
mod config;
mod db;
mod dto;
mod error;
mod extractors;
mod handlers;
mod middleware;
mod models;
mod providers;
mod routes;
mod services;
mod state;

#[cfg(test)]
mod tests;

use config::AppConfig;
use db::{schema, DbPool};
use state::AppState;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

#[tokio::main]
async fn main() {
    // 1. Load .env
    dotenvy::dotenv().ok();

    // 2. Init tracing
    let env_filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info"));
    tracing_subscriber::registry()
        .with(env_filter)
        .with(tracing_subscriber::fmt::layer())
        .init();

    // 3. Load config
    let config = AppConfig::from_env().unwrap_or_else(|e| {
        eprintln!("Configuration error: {}", e);
        std::process::exit(1);
    });

    tracing::info!(
        host = %config.host,
        port = config.port,
        db_client = ?config.db_client,
        env = %config.node_env,
        "Starting chatgpt-backend"
    );

    // 4. Connect DB
    let db = match config.db_client {
        config::DbClient::Sqlite => {
            tracing::info!(path = %config.sqlite_db_path, "Connecting to SQLite");
            DbPool::connect_sqlite(&config.sqlite_db_path)
                .await
                .unwrap_or_else(|e| {
                    tracing::error!(error = %e, "Failed to connect to SQLite");
                    std::process::exit(1);
                })
        }
        config::DbClient::Postgres => {
            let url = config.database_url.as_deref().unwrap_or_else(|| {
                eprintln!("DATABASE_URL is required when DB_CLIENT=postgres");
                std::process::exit(1);
            });
            tracing::info!("Connecting to PostgreSQL");
            DbPool::connect_postgres(url).await.unwrap_or_else(|e| {
                tracing::error!(error = %e, "Failed to connect to PostgreSQL");
                std::process::exit(1);
            })
        }
    };

    // 5. Initialize schema
    schema::initialize(&db).await.unwrap_or_else(|e| {
        tracing::error!(error = %e, "Failed to initialize database schema");
        std::process::exit(1);
    });

    // 6. Build AppState
    let state = AppState::new(db.clone(), config.clone());

    // 7. Spawn hourly token cleanup task
    {
        let db_clone = db.clone();
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(std::time::Duration::from_secs(3600));
            loop {
                interval.tick().await;
                tracing::debug!("Running expired token cleanup");
                handlers::auth::cleanup_expired_tokens(&db_clone).await;
            }
        });
    }

    // 8. Spawn API key cache cleanup task (every 10 min)
    {
        let cache = state.api_key_cache.clone();
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(std::time::Duration::from_secs(600));
            loop {
                interval.tick().await;
                tracing::debug!("Running API key cache cleanup");
                cache.cleanup();
            }
        });
    }

    // 8b. Spawn rate limit cleanup task (every minute)
    services::spawn_cleanup_tasks(db.clone());

    // 9. Build router
    let router = app::build_router(state);

    // 10. Bind TCP listener
    let addr = format!("{}:{}", config.host, config.port);
    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .unwrap_or_else(|e| {
            tracing::error!(error = %e, addr = %addr, "Failed to bind listener");
            std::process::exit(1);
        });

    tracing::info!(addr = %addr, "Server listening");

    // 11. Graceful shutdown on SIGTERM/SIGINT
    let shutdown = async move {
        #[cfg(unix)]
        {
            use tokio::signal::unix::{signal, SignalKind};
            let mut sigterm =
                signal(SignalKind::terminate()).expect("Failed to install SIGTERM handler");
            let mut sigint =
                signal(SignalKind::interrupt()).expect("Failed to install SIGINT handler");
            tokio::select! {
                _ = sigterm.recv() => tracing::info!("Received SIGTERM"),
                _ = sigint.recv() => tracing::info!("Received SIGINT"),
            }
        }
        #[cfg(not(unix))]
        {
            tokio::signal::ctrl_c()
                .await
                .expect("Failed to install Ctrl+C handler");
            tracing::info!("Received Ctrl+C");
        }

        tracing::info!("Shutdown signal received, closing database connection");
        db.close().await;
        tracing::info!("Database connection closed");
    };

    axum::serve(listener, router)
        .with_graceful_shutdown(shutdown)
        .await
        .unwrap_or_else(|e| {
            tracing::error!(error = %e, "Server error");
            std::process::exit(1);
        });
}
