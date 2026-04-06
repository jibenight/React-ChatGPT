use crate::{handlers, state::AppState};
use axum::{routing::{get, post}, Router};

pub fn router() -> Router<AppState> {
  Router::new()
    .route("/auth/google", get(handlers::oauth::google_auth))
    .route("/auth/google/callback", get(handlers::oauth::google_callback))
    .route("/auth/github", get(handlers::oauth::github_auth))
    .route("/auth/github/callback", get(handlers::oauth::github_callback))
    .route("/auth/apple", get(handlers::oauth::apple_auth))
    .route("/auth/apple/callback", post(handlers::oauth::apple_callback))
}
