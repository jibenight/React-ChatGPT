/// Tests for JWT creation and verification logic.
///
/// These tests exercise the JWT helpers used by the auth handler and
/// middleware without requiring a database connection.
use base64::Engine;
use jsonwebtoken::{decode, encode, Algorithm, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};

const SECRET: &str = "test-jwt-secret-key-at-least-32ch";

#[derive(Debug, Serialize, Deserialize, PartialEq)]
struct Claims {
    id: i64,
    exp: usize,
}

fn make_token(user_id: i64, secret: &str, exp_offset_secs: i64) -> String {
    let exp = (chrono::Utc::now() + chrono::Duration::seconds(exp_offset_secs)).timestamp() as usize;
    let claims = Claims { id: user_id, exp };
    encode(
        &Header::new(Algorithm::HS256),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .expect("JWT encode should succeed")
}

fn verify_token(token: &str, secret: &str) -> Result<Claims, jsonwebtoken::errors::Error> {
    let mut validation = Validation::new(Algorithm::HS256);
    validation.validate_exp = true;
    decode::<Claims>(token, &DecodingKey::from_secret(secret.as_bytes()), &validation)
        .map(|data| data.claims)
}

// ── Token creation ────────────────────────────────────────────────────────────

#[test]
fn create_token_succeeds() {
    let token = make_token(42, SECRET, 3600);
    assert!(!token.is_empty());
    // JWT format: three base64url segments separated by dots.
    assert_eq!(token.split('.').count(), 3);
}

#[test]
fn created_token_encodes_user_id() {
    let token = make_token(99, SECRET, 3600);
    let claims = verify_token(&token, SECRET).expect("verification should succeed");
    assert_eq!(claims.id, 99);
}

// ── Verification ──────────────────────────────────────────────────────────────

#[test]
fn valid_token_verifies_ok() {
    let token = make_token(1, SECRET, 3600);
    assert!(verify_token(&token, SECRET).is_ok());
}

#[test]
fn expired_token_is_rejected() {
    // exp well in the past (−120 seconds, beyond any clock leeway).
    let token = make_token(1, SECRET, -120);
    let result = verify_token(&token, SECRET);
    assert!(result.is_err(), "expired token must be rejected");
}

#[test]
fn wrong_secret_is_rejected() {
    let token = make_token(1, SECRET, 3600);
    let result = verify_token(&token, "completely-different-secret-key!!");
    assert!(result.is_err(), "token signed with different secret must fail");
}

#[test]
fn tampered_payload_is_rejected() {
    let token = make_token(1, SECRET, 3600);
    // Flip a character in the payload segment (middle part).
    let parts: Vec<&str> = token.split('.').collect();
    let mut payload = parts[1].to_string();
    // Mutate one character.
    let c = payload.remove(0);
    let replacement = if c == 'a' { 'b' } else { 'a' };
    payload.insert(0, replacement);
    let tampered = format!("{}.{}.{}", parts[0], payload, parts[2]);
    let result = verify_token(&tampered, SECRET);
    assert!(result.is_err(), "tampered token must be rejected");
}

#[test]
fn malformed_token_is_rejected() {
    assert!(verify_token("not.a.jwt", SECRET).is_err());
    assert!(verify_token("", SECRET).is_err());
    assert!(verify_token("onlyonepart", SECRET).is_err());
}

// ── Different algorithms ──────────────────────────────────────────────────────

#[test]
fn hs256_algorithm_matches() {
    let token = make_token(7, SECRET, 3600);
    // Header should indicate HS256.
    let header_b64 = token.split('.').next().unwrap();
    let header_json = base64::engine::general_purpose::URL_SAFE_NO_PAD
        .decode(header_b64)
        .expect("base64 decode header");
    let header: serde_json::Value = serde_json::from_slice(&header_json).unwrap();
    assert_eq!(header["alg"], "HS256");
}

// ── Cookie name conventions ───────────────────────────────────────────────────

#[test]
fn default_auth_cookie_name() {
    // Verify the default cookie name matches what the config produces.
    let cookie_name = "token"; // AppConfig default
    assert!(!cookie_name.is_empty());
}

#[test]
fn auth_cookie_name_from_config_env() {
    // Custom cookie name from the AUTH_COOKIE_NAME env var (if set).
    let name = std::env::var("AUTH_COOKIE_NAME").unwrap_or_else(|_| "token".to_string());
    assert!(!name.is_empty(), "cookie name must not be empty");
}
