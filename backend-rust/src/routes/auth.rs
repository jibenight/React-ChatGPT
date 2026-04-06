use crate::{handlers, state::AppState};
use axum::{routing::{get, post}, Router};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/register", post(handlers::auth::register))
        .route("/login", post(handlers::auth::login))
        .route("/logout", post(handlers::auth::logout))
        .route("/reset-password-request", post(handlers::auth::reset_password_request))
        .route("/reset-password", post(handlers::auth::reset_password))
        .route("/verify-email", get(handlers::auth::verify_email))
        .route("/verify-email-request", post(handlers::auth::resend_verification))
}
