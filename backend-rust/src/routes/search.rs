use crate::{handlers, middleware::auth::require_auth, state::AppState};
use axum::{middleware, routing::get, Router};

pub fn router(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/api/search", get(handlers::search::search))
        .route_layer(middleware::from_fn_with_state(state, require_auth))
}
