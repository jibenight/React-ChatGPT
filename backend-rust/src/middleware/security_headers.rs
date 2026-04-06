use axum::{body::Body, http::Request, middleware::Next, response::Response};

/// Add security headers equivalent to Node.js `helmet()`.
pub async fn add_security_headers(req: Request<Body>, next: Next) -> Response {
    let mut response = next.run(req).await;
    let headers = response.headers_mut();

    headers.insert(
        "x-content-type-options",
        "nosniff".parse().unwrap(),
    );
    headers.insert("x-frame-options", "DENY".parse().unwrap());
    // Disable legacy XSS filter (modern browsers ignore it; it can introduce vulnerabilities).
    headers.insert("x-xss-protection", "0".parse().unwrap());
    headers.insert(
        "strict-transport-security",
        "max-age=31536000; includeSubDomains".parse().unwrap(),
    );
    headers.insert(
        "referrer-policy",
        "strict-origin-when-cross-origin".parse().unwrap(),
    );
    headers.insert(
        "permissions-policy",
        "camera=(), microphone=(), geolocation=()".parse().unwrap(),
    );
    headers.insert(
        "content-security-policy",
        concat!(
            "default-src 'self'; ",
            "script-src 'self'; ",
            "style-src 'self' 'unsafe-inline'; ",
            "img-src 'self' data: blob:; ",
            "connect-src 'self' https://api.stripe.com; ",
            "frame-src https://js.stripe.com https://hooks.stripe.com"
        )
        .parse()
        .unwrap(),
    );

    response
}
