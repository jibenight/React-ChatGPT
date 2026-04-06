use axum::{body::Body, http::Request, middleware::Next, response::Response};
use uuid::Uuid;

/// Generate or propagate a `X-Request-Id` header.
///
/// If the incoming request already has an `X-Request-Id` header, its value is
/// preserved; otherwise a new UUID v4 is generated.  The id is stored in
/// request extensions (`RequestId`) and echoed in the response headers.
#[derive(Clone, Debug)]
pub struct RequestId(pub String);

pub async fn set_request_id(mut req: Request<Body>, next: Next) -> Response {
    let id = req
        .headers()
        .get("x-request-id")
        .and_then(|v| v.to_str().ok())
        .filter(|s| !s.is_empty())
        .map(str::to_owned)
        .unwrap_or_else(|| Uuid::new_v4().to_string());

    req.extensions_mut().insert(RequestId(id.clone()));

    let mut response = next.run(req).await;
    if let Ok(hv) = id.parse() {
        response.headers_mut().insert("x-request-id", hv);
    }
    response
}
