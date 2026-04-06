use crate::error::AppError;
use axum::{
    body::Body,
    http::{Method, Request, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
};
use axum_extra::extract::cookie::{Cookie, CookieJar, SameSite};
use uuid::Uuid;

/// Paths that are exempt from CSRF verification (matching Node.js exclusion list).
const EXCLUDED_PATHS: &[&str] = &[
    "/healthz",
    "/login",
    "/register",
    "/logout",
    "/reset-password-request",
    "/reset-password",
    "/verify-email",
    "/verify-email-request",
    "/api/billing/webhook",
    "/auth/google/callback",
    "/auth/github/callback",
    "/auth/apple/callback",
];

const CSRF_COOKIE: &str = "__csrf";
const CSRF_HEADER: &str = "x-csrf-token";

/// Double-submit cookie CSRF protection middleware.
///
/// - Safe methods (GET, HEAD, OPTIONS): set the `__csrf` cookie if absent.
/// - Mutating methods (POST, PATCH, DELETE): verify the `X-CSRF-Token` header
///   matches the `__csrf` cookie value.
/// - Excluded paths skip all checks.
pub async fn csrf_protection(
    jar: CookieJar,
    req: Request<Body>,
    next: Next,
) -> Result<(CookieJar, Response), AppError> {
    let path = req.uri().path().to_owned();
    let method = req.method().clone();

    // Skip for excluded paths.
    if EXCLUDED_PATHS.contains(&path.as_str()) {
        return Ok((jar, next.run(req).await));
    }

    let is_safe = matches!(method, Method::GET | Method::HEAD | Method::OPTIONS);

    if is_safe {
        // Ensure the CSRF cookie exists; create one if not.
        if jar.get(CSRF_COOKIE).is_none() {
            let token = Uuid::new_v4().to_string();
            let cookie = Cookie::build((CSRF_COOKIE, token))
                .http_only(false) // must be readable by JS for double-submit
                .same_site(SameSite::Lax)
                .path("/")
                .build();
            let updated_jar = jar.add(cookie);
            return Ok((updated_jar, next.run(req).await));
        }
        return Ok((jar, next.run(req).await));
    }

    // For mutating methods, verify CSRF.
    let cookie_token = match jar.get(CSRF_COOKIE).map(|c| c.value().to_owned()) {
        Some(t) if !t.is_empty() => t,
        _ => {
            return Ok((
                jar,
                (
                    StatusCode::FORBIDDEN,
                    axum::Json(serde_json::json!({ "error": "CSRF token missing" })),
                )
                    .into_response(),
            ))
        }
    };

    let header_token = req
        .headers()
        .get(CSRF_HEADER)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");

    if cookie_token != header_token {
        return Ok((
            jar,
            (
                StatusCode::FORBIDDEN,
                axum::Json(serde_json::json!({ "error": "CSRF token invalid" })),
            )
                .into_response(),
        ));
    }

    Ok((jar, next.run(req).await))
}
