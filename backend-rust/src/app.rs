use crate::middleware::{
    add_security_headers, cors_layer, csrf_protection, set_request_id,
};
use crate::routes;
use crate::state::AppState;
use axum::{
    extract::State,
    http::StatusCode,
    middleware,
    routing::get,
    Json, Router,
};
use serde_json::{json, Value};
use std::time::{SystemTime, UNIX_EPOCH};
use tower_http::limit::RequestBodyLimitLayer;

pub fn build_router(state: AppState) -> Router {
    let cors = cors_layer(&state.config);

    // Layers are applied bottom-up: the last `.layer()` call wraps outermost.
    // Execution order (outermost → innermost):
    //   request_id → security_headers → cors → body_limit → csrf
    Router::new()
        .route("/healthz", get(healthz))
        .merge(routes::auth::router())
        .merge(routes::oauth::router())
        .merge(routes::users::router(state.clone()))
        .merge(routes::projects::router(state.clone()))
        .merge(routes::threads::router(state.clone()))
        .merge(routes::billing::router(state.clone()))
        .merge(routes::chat::router(state.clone()))
        .merge(routes::search::router(state.clone()))
        .layer(middleware::from_fn(csrf_protection))
        .layer(RequestBodyLimitLayer::new(15 * 1024 * 1024))
        .layer(cors)
        .layer(middleware::from_fn(add_security_headers))
        .layer(middleware::from_fn(set_request_id))
        .with_state(state)
}

async fn healthz(State(state): State<AppState>) -> (StatusCode, Json<Value>) {
    let uptime = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);

    match state.db.ping().await {
        Ok(()) => (
            StatusCode::OK,
            Json(json!({
                "status": "ok",
                "db": "connected",
                "uptime": uptime,
                "timestamp": chrono::Utc::now().to_rfc3339(),
            })),
        ),
        Err(e) => {
            tracing::error!(error = %e, "Health check DB ping failed");
            (
                StatusCode::SERVICE_UNAVAILABLE,
                Json(json!({
                    "status": "unhealthy",
                    "db": "disconnected",
                    "uptime": uptime,
                    "timestamp": chrono::Utc::now().to_rfc3339(),
                })),
            )
        }
    }
}
