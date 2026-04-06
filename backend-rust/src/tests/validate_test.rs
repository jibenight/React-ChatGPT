/// Tests for DTO validation schemas using the `validator` crate.
use crate::dto::{
    auth::{LoginRequest, RegisterRequest, ResetPasswordConfirm, ResetPasswordRequest},
    users::{ProviderParam, UpdateApiKeyRequest},
    billing::CreateCheckoutRequest,
};
use validator::Validate;

// ── RegisterRequest ──────────────────────────────────────────────────────────

#[test]
fn register_valid() {
    let r = RegisterRequest {
        username: "alice".to_string(),
        email: "alice@example.com".to_string(),
        password: "securepassword".to_string(),
    };
    assert!(r.validate().is_ok());
}

#[test]
fn register_username_too_short() {
    let r = RegisterRequest {
        username: "a".to_string(),
        email: "alice@example.com".to_string(),
        password: "securepassword".to_string(),
    };
    assert!(r.validate().is_err(), "username 'a' is too short");
}

#[test]
fn register_username_too_long() {
    let r = RegisterRequest {
        username: "a".repeat(51),
        email: "alice@example.com".to_string(),
        password: "securepassword".to_string(),
    };
    assert!(r.validate().is_err(), "username over 50 chars should fail");
}

#[test]
fn register_invalid_email() {
    let r = RegisterRequest {
        username: "alice".to_string(),
        email: "not-an-email".to_string(),
        password: "securepassword".to_string(),
    };
    assert!(r.validate().is_err(), "bad email should fail validation");
}

#[test]
fn register_password_too_short() {
    let r = RegisterRequest {
        username: "alice".to_string(),
        email: "alice@example.com".to_string(),
        password: "short".to_string(),
    };
    assert!(r.validate().is_err(), "password under 8 chars should fail");
}

// ── LoginRequest ─────────────────────────────────────────────────────────────

#[test]
fn login_valid() {
    let r = LoginRequest {
        email: "alice@example.com".to_string(),
        password: "anypassword".to_string(),
    };
    assert!(r.validate().is_ok());
}

#[test]
fn login_invalid_email() {
    let r = LoginRequest {
        email: "bad".to_string(),
        password: "anypassword".to_string(),
    };
    assert!(r.validate().is_err());
}

#[test]
fn login_empty_password() {
    let r = LoginRequest {
        email: "alice@example.com".to_string(),
        password: "".to_string(),
    };
    assert!(r.validate().is_err(), "empty password should fail");
}

// ── ResetPasswordRequest ──────────────────────────────────────────────────────

#[test]
fn reset_password_request_valid() {
    let r = ResetPasswordRequest {
        email: "alice@example.com".to_string(),
    };
    assert!(r.validate().is_ok());
}

#[test]
fn reset_password_request_invalid_email() {
    let r = ResetPasswordRequest {
        email: "notanemail".to_string(),
    };
    assert!(r.validate().is_err());
}

// ── ResetPasswordConfirm ──────────────────────────────────────────────────────

#[test]
fn reset_password_confirm_valid() {
    let r = ResetPasswordConfirm {
        token: "some-token-string".to_string(),
        new_password: "NewPassword1!".to_string(),
    };
    assert!(r.validate().is_ok());
}

#[test]
fn reset_password_confirm_empty_token() {
    let r = ResetPasswordConfirm {
        token: "".to_string(),
        new_password: "NewPassword1!".to_string(),
    };
    assert!(r.validate().is_err(), "empty token should fail");
}

#[test]
fn reset_password_confirm_short_password() {
    let r = ResetPasswordConfirm {
        token: "valid-token".to_string(),
        new_password: "short".to_string(),
    };
    assert!(r.validate().is_err(), "short new_password should fail");
}

// ── UpdateApiKeyRequest ───────────────────────────────────────────────────────

#[test]
fn update_api_key_valid() {
    let r = UpdateApiKeyRequest {
        provider: "openai".to_string(),
        api_key: "sk-test-1234".to_string(),
    };
    assert!(r.validate().is_ok());
}

#[test]
fn update_api_key_empty_provider() {
    let r = UpdateApiKeyRequest {
        provider: "".to_string(),
        api_key: "sk-test-1234".to_string(),
    };
    assert!(r.validate().is_err(), "empty provider should fail");
}

#[test]
fn update_api_key_empty_key() {
    let r = UpdateApiKeyRequest {
        provider: "openai".to_string(),
        api_key: "".to_string(),
    };
    assert!(r.validate().is_err(), "empty api_key should fail");
}

// ── ProviderParam ─────────────────────────────────────────────────────────────

#[test]
fn provider_param_valid() {
    let r = ProviderParam {
        provider: "gemini".to_string(),
    };
    assert!(r.validate().is_ok());
}

#[test]
fn provider_param_empty() {
    let r = ProviderParam {
        provider: "".to_string(),
    };
    assert!(r.validate().is_err());
}

// ── CreateCheckoutRequest ──────────────────────────────────────────────

#[test]
fn checkout_session_valid_pro_monthly() {
    let r = CreateCheckoutRequest {
        plan: "pro".to_string(),
        interval: "monthly".to_string(),
    };
    assert!(r.validate().is_ok());
}

#[test]
fn checkout_session_valid_team_yearly() {
    let r = CreateCheckoutRequest {
        plan: "team".to_string(),
        interval: "yearly".to_string(),
    };
    assert!(r.validate().is_ok());
}
