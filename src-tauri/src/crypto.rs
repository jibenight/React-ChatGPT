//! AES-256-GCM encryption/decryption compatible with the Node.js format.
//!
//! Format: base64(iv[12] + authTag[16] + ciphertext)
//! Key derivation: scrypt(secret, "react-chatgpt-salt", 32)

use aes_gcm::aead::{Aead, KeyInit};
use aes_gcm::{Aes256Gcm, Nonce};
use base64::engine::general_purpose::STANDARD as B64;
use base64::Engine;
use rand::RngCore;
use scrypt::scrypt;

use crate::error::AppError;

const IV_LEN: usize = 12;
const TAG_LEN: usize = 16;
const KEY_LEN: usize = 32;
const SALT: &[u8] = b"react-chatgpt-salt";

/// Derive a 32-byte key from a secret using scrypt (matching Node.js scryptSync defaults).
fn derive_key(secret: &str) -> Result<[u8; KEY_LEN], AppError> {
    let mut key = [0u8; KEY_LEN];
    // Node.js scryptSync defaults: N=16384, r=8, p=1
    let params = scrypt::Params::new(14, 8, 1, KEY_LEN)
        .map_err(|e| AppError::Encryption(format!("scrypt params: {e}")))?;
    scrypt(secret.as_bytes(), SALT, &params, &mut key)
        .map_err(|e| AppError::Encryption(format!("scrypt derive: {e}")))?;
    Ok(key)
}

pub fn encrypt(plaintext: &str, secret: &str) -> Result<String, AppError> {
    let key_bytes = derive_key(secret)?;
    let cipher = Aes256Gcm::new_from_slice(&key_bytes)
        .map_err(|e| AppError::Encryption(format!("cipher init: {e}")))?;

    let mut iv = [0u8; IV_LEN];
    rand::thread_rng().fill_bytes(&mut iv);
    let nonce = Nonce::from_slice(&iv);

    let ciphertext = cipher
        .encrypt(nonce, plaintext.as_bytes())
        .map_err(|e| AppError::Encryption(format!("encrypt: {e}")))?;

    // aes-gcm appends the 16-byte tag to ciphertext, so split it out
    // to match Node.js format: iv + tag + encrypted
    let ct_len = ciphertext.len() - TAG_LEN;
    let tag = &ciphertext[ct_len..];
    let encrypted = &ciphertext[..ct_len];

    let mut result = Vec::with_capacity(IV_LEN + TAG_LEN + encrypted.len());
    result.extend_from_slice(&iv);
    result.extend_from_slice(tag);
    result.extend_from_slice(encrypted);

    Ok(B64.encode(&result))
}

pub fn decrypt(ciphertext: &str, secret: &str) -> Result<String, AppError> {
    let buf = B64
        .decode(ciphertext)
        .map_err(|e| AppError::Encryption(format!("base64 decode: {e}")))?;

    if buf.len() < IV_LEN + TAG_LEN + 1 {
        return Err(AppError::Encryption("Invalid ciphertext length".into()));
    }

    let iv = &buf[..IV_LEN];
    let tag = &buf[IV_LEN..IV_LEN + TAG_LEN];
    let encrypted = &buf[IV_LEN + TAG_LEN..];

    let key_bytes = derive_key(secret)?;
    let cipher = Aes256Gcm::new_from_slice(&key_bytes)
        .map_err(|e| AppError::Encryption(format!("cipher init: {e}")))?;

    // Reconstruct the aes-gcm expected format: encrypted + tag
    let mut combined = Vec::with_capacity(encrypted.len() + TAG_LEN);
    combined.extend_from_slice(encrypted);
    combined.extend_from_slice(tag);

    let nonce = Nonce::from_slice(iv);
    let plaintext = cipher
        .decrypt(nonce, combined.as_ref())
        .map_err(|_| AppError::Encryption("Decryption failed (bad key or corrupted data)".into()))?;

    String::from_utf8(plaintext)
        .map_err(|e| AppError::Encryption(format!("utf8 decode: {e}")))
}
