use crate::config::AppConfig;
use axum::http::{HeaderName, HeaderValue, Method};
use tower_http::cors::{AllowHeaders, AllowMethods, AllowOrigin, CorsLayer};

/// Build a CORS layer from config.
///
/// Allowed origins: `CORS_ALLOWED_ORIGINS` (comma-separated) + `APP_URL`.
/// Allows credentials, common methods, and the project-specific headers.
pub fn cors_layer(config: &AppConfig) -> CorsLayer {
    let mut origins: Vec<HeaderValue> = config
        .cors_allowed_origins
        .iter()
        .filter_map(|o| HeaderValue::from_str(o).ok())
        .collect();

    if let Some(ref app_url) = config.app_url {
        let normalized = app_url.trim_end_matches('/');
        if let Ok(hv) = HeaderValue::from_str(normalized) {
            if !origins.contains(&hv) {
                origins.push(hv);
            }
        }
    }

    CorsLayer::new()
        .allow_origin(AllowOrigin::list(origins))
        .allow_methods(AllowMethods::list([
            Method::GET,
            Method::POST,
            Method::PATCH,
            Method::DELETE,
            Method::OPTIONS,
        ]))
        .allow_headers(AllowHeaders::list([
            HeaderName::from_static("content-type"),
            HeaderName::from_static("authorization"),
            HeaderName::from_static("x-csrf-token"),
            HeaderName::from_static("x-request-id"),
            HeaderName::from_static("x-dev-user-email"),
            HeaderName::from_static("x-dev-user-name"),
        ]))
        .expose_headers([HeaderName::from_static("x-request-id")])
        .allow_credentials(true)
        .max_age(std::time::Duration::from_secs(86_400))
}
