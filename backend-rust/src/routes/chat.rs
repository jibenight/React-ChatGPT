use crate::{handlers, middleware::auth::require_auth, state::AppState};
use axum::{middleware, routing::post, Router};

pub fn router(state: AppState) -> Router<AppState> {
  Router::new()
    .route("/api/chat/message", post(handlers::chat::send_message))
    .route_layer(middleware::from_fn_with_state(state, require_auth))
}
