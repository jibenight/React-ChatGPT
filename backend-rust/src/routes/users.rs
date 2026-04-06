use crate::{handlers, middleware::auth::require_auth, state::AppState};
use axum::{
    middleware,
    routing::{delete, get, post},
    Router,
};

pub fn router(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/api/users", get(handlers::users::get_users))
        .route("/api/update-api-key", post(handlers::users::update_api_key))
        .route("/api/update-user-data", post(handlers::users::update_user_data))
        .route("/api/api-keys", get(handlers::users::get_api_keys))
        .route("/api/api-keys/{provider}", delete(handlers::users::delete_api_key))
        .route("/api/users/me", delete(handlers::users::delete_account))
        .route_layer(middleware::from_fn_with_state(state, require_auth))
}
