use crate::{handlers, middleware::auth::require_auth, state::AppState};
use axum::{
    middleware,
    routing::{delete, get, patch, post},
    Router,
};

pub fn router(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/api/projects", get(handlers::projects::list_projects))
        .route("/api/projects", post(handlers::projects::create_project))
        .route("/api/projects/{project_id}", get(handlers::projects::get_project))
        .route("/api/projects/{project_id}", patch(handlers::projects::update_project))
        .route("/api/projects/{project_id}", delete(handlers::projects::delete_project))
        .route("/api/projects/{project_id}/members", get(handlers::projects::get_members))
        .route("/api/projects/{project_id}/members", post(handlers::projects::add_member))
        .route("/api/projects/{project_id}/members/{user_id}", patch(handlers::projects::update_member_role))
        .route("/api/projects/{project_id}/members/{user_id}", delete(handlers::projects::remove_member))
        .route("/api/projects/{project_id}/threads", get(handlers::threads::list_project_threads))
        .route("/api/projects/{project_id}/threads", post(handlers::threads::create_project_thread))
        .route_layer(middleware::from_fn_with_state(state, require_auth))
}
