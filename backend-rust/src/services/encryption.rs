use aes_gcm::{
    aead::{Aead, AeadCore, KeyInit, OsRng},
    Aes256Gcm, Key, Nonce,
};
use anyhow::{anyhow, Result};
use base64::{engine::general_purpose::STANDARD as B64, Engine};
use scrypt::{scrypt, Params as ScryptParams};

const IV_LENGTH: usize = 12;
const TAG_LENGTH: usize = 16;
const KEY_LENGTH: usize = 32;

/// Legacy crypto-js AES format prefix (OpenSSL "Salted__" header, base64-encoded).
const CRYPTO_JS_PREFIX: &str = "U2FsdGVkX1";

fn derive_key(secret: &str, salt: &str) -> Result<[u8; KEY_LENGTH]> {
    let params = ScryptParams::new(14, 8, 1, KEY_LENGTH)
        .map_err(|e| anyhow!("scrypt params error: {}", e))?;
    let mut key = [0u8; KEY_LENGTH];
    scrypt(secret.as_bytes(), salt.as_bytes(), &params, &mut key)
        .map_err(|e| anyhow!("scrypt derivation error: {}", e))?;
    Ok(key)
}

/// Encrypt `plaintext` using AES-256-GCM.
///
/// Returns `base64(iv[12] || authTag[16] || ciphertext)`.
pub fn encrypt(plaintext: &str, secret: &str, salt: &str) -> Result<String> {
    let raw_key = derive_key(secret, salt)?;
    let key = Key::<Aes256Gcm>::from_slice(&raw_key);
    let cipher = Aes256Gcm::new(key);
    let nonce = Aes256Gcm::generate_nonce(&mut OsRng);

    // aes-gcm appends the 16-byte tag to the ciphertext automatically.
    let ciphertext_with_tag = cipher
        .encrypt(&nonce, plaintext.as_bytes())
        .map_err(|e| anyhow!("Encryption failed: {}", e))?;

    // ciphertext_with_tag = ciphertext || tag (tag at the end)
    let ct_len = ciphertext_with_tag.len();
    if ct_len < TAG_LENGTH {
        return Err(anyhow!("Encrypted output too short"));
    }

    // Rearrange to: iv || tag || ciphertext  (matching Node.js format)
    let ciphertext = &ciphertext_with_tag[..ct_len - TAG_LENGTH];
    let tag = &ciphertext_with_tag[ct_len - TAG_LENGTH..];

    let mut combined = Vec::with_capacity(IV_LENGTH + TAG_LENGTH + ciphertext.len());
    combined.extend_from_slice(nonce.as_slice());
    combined.extend_from_slice(tag);
    combined.extend_from_slice(ciphertext);

    Ok(B64.encode(combined))
}

/// Decrypt a ciphertext produced by `encrypt()`.
///
/// Detects the legacy crypto-js format (`U2FsdGVkX1` prefix) and returns an
/// actionable error — full crypto-js compatibility requires the `crypto-js` JS
/// runtime and cannot be replicated here without a significant amount of
/// additional work.
pub fn decrypt(ciphertext: &str, secret: &str, salt: &str) -> Result<String> {
    if ciphertext.starts_with(CRYPTO_JS_PREFIX) {
        return Err(anyhow!(
            "Legacy crypto-js ciphertext detected. \
             Migration required: re-encrypt this value with the new AES-256-GCM format \
             before the Rust backend can decrypt it."
        ));
    }

    let buf = B64
        .decode(ciphertext)
        .map_err(|e| anyhow!("Base64 decode error: {}", e))?;

    if buf.len() < IV_LENGTH + TAG_LENGTH + 1 {
        return Err(anyhow!("Invalid ciphertext: too short"));
    }

    let iv = &buf[..IV_LENGTH];
    let tag = &buf[IV_LENGTH..IV_LENGTH + TAG_LENGTH];
    let encrypted = &buf[IV_LENGTH + TAG_LENGTH..];

    // Rebuild aes-gcm format: ciphertext || tag
    let mut ct_with_tag = Vec::with_capacity(encrypted.len() + TAG_LENGTH);
    ct_with_tag.extend_from_slice(encrypted);
    ct_with_tag.extend_from_slice(tag);

    let raw_key = derive_key(secret, salt)?;
    let key = Key::<Aes256Gcm>::from_slice(&raw_key);
    let cipher = Aes256Gcm::new(key);
    let nonce = Nonce::from_slice(iv);

    let plaintext = cipher
        .decrypt(nonce, ct_with_tag.as_slice())
        .map_err(|e| anyhow!("Decryption failed (wrong key or corrupted data): {}", e))?;

    String::from_utf8(plaintext).map_err(|e| anyhow!("Decrypted data is not valid UTF-8: {}", e))
}

#[cfg(test)]
mod tests {
    use super::*;

    const SECRET: &str = "test-secret-key-at-least-32-chars!!";
    const SALT: &str = "react-chatgpt-salt";

    #[test]
    fn round_trip() {
        let plaintext = "my-api-key-12345";
        let encrypted = encrypt(plaintext, SECRET, SALT).unwrap();
        let decrypted = decrypt(&encrypted, SECRET, SALT).unwrap();
        assert_eq!(decrypted, plaintext);
    }

    #[test]
    fn different_ciphertexts_same_plaintext() {
        let a = encrypt("hello", SECRET, SALT).unwrap();
        let b = encrypt("hello", SECRET, SALT).unwrap();
        // IVs are random, so ciphertexts must differ
        assert_ne!(a, b);
        assert_eq!(decrypt(&a, SECRET, SALT).unwrap(), "hello");
        assert_eq!(decrypt(&b, SECRET, SALT).unwrap(), "hello");
    }

    #[test]
    fn crypto_js_legacy_returns_error() {
        let fake_legacy = "U2FsdGVkX1abc123";
        let err = decrypt(fake_legacy, SECRET, SALT).unwrap_err();
        assert!(err.to_string().contains("Legacy crypto-js"));
    }
}
