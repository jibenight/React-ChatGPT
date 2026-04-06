use crate::services::{decrypt, encrypt};

const SECRET: &str = "integration-test-secret-key-32ch";
const SALT: &str = "react-chatgpt-salt";

#[test]
fn encrypt_decrypt_roundtrip() {
    let plaintext = "sk-my-openai-api-key-1234567890";
    let ciphertext = encrypt(plaintext, SECRET, SALT).expect("encrypt should succeed");
    let decrypted = decrypt(&ciphertext, SECRET, SALT).expect("decrypt should succeed");
    assert_eq!(decrypted, plaintext);
}

#[test]
fn different_keys_fail_to_decrypt() {
    let plaintext = "my-secret-api-key";
    let ciphertext = encrypt(plaintext, SECRET, SALT).expect("encrypt should succeed");
    let result = decrypt(&ciphertext, "wrong-key-completely-different!!", SALT);
    assert!(result.is_err(), "decryption with wrong key should fail");
}

#[test]
fn different_salts_fail_to_decrypt() {
    let plaintext = "my-secret-api-key";
    let ciphertext = encrypt(plaintext, SECRET, SALT).expect("encrypt should succeed");
    let result = decrypt(&ciphertext, SECRET, "wrong-salt");
    assert!(result.is_err(), "decryption with wrong salt should fail");
}

#[test]
fn same_plaintext_produces_different_ciphertexts() {
    let a = encrypt("hello", SECRET, SALT).expect("encrypt a");
    let b = encrypt("hello", SECRET, SALT).expect("encrypt b");
    // Random IV means ciphertexts differ even for the same plaintext.
    assert_ne!(a, b, "ciphertexts should differ due to random IV");
    // Both must still decrypt correctly.
    assert_eq!(decrypt(&a, SECRET, SALT).unwrap(), "hello");
    assert_eq!(decrypt(&b, SECRET, SALT).unwrap(), "hello");
}

#[test]
fn legacy_crypto_js_prefix_detected() {
    // Any value starting with the OpenSSL "Salted__" base64 prefix.
    let legacy = "U2FsdGVkX1abcdef1234";
    let err = decrypt(legacy, SECRET, SALT).expect_err("legacy format must return error");
    let msg = err.to_string();
    assert!(
        msg.contains("Legacy crypto-js"),
        "error should mention legacy crypto-js, got: {}", msg
    );
}

#[test]
fn corrupt_ciphertext_returns_error() {
    let plaintext = "test";
    let mut ciphertext = encrypt(plaintext, SECRET, SALT).expect("encrypt");
    // Flip last character to corrupt the ciphertext.
    let last = ciphertext.pop().unwrap();
    let replacement = if last == 'A' { 'B' } else { 'A' };
    ciphertext.push(replacement);
    let result = decrypt(&ciphertext, SECRET, SALT);
    assert!(result.is_err(), "corrupted ciphertext should fail to decrypt");
}

#[test]
fn unicode_roundtrip() {
    let plaintext = "clé-API-avec-accents-🔑";
    let ciphertext = encrypt(plaintext, SECRET, SALT).expect("unicode encrypt");
    let decrypted = decrypt(&ciphertext, SECRET, SALT).expect("unicode decrypt");
    assert_eq!(decrypted, plaintext);
}
