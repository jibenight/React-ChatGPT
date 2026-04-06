use crate::{handlers, middleware::auth::require_auth, state::AppState};
use axum::{
    middleware,
    routing::{delete, get, patch, post},
    Router,
};

pub fn router(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/api/threads", get(handlers::threads::list_threads))
        .route("/api/threads", post(handlers::threads::create_thread))
        .route("/api/threads/{thread_id}/messages", get(handlers::threads::get_thread_messages))
        .route("/api/threads/{thread_id}/export", get(handlers::threads::export_thread))
        .route("/api/threads/{thread_id}", patch(handlers::threads::update_thread))
        .route("/api/threads/{thread_id}", delete(handlers::threads::delete_thread))
        .route_layer(middleware::from_fn_with_state(state, require_auth))
}
