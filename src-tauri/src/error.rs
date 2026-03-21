use serde::Serialize;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("Erreur de base de données: {0}")]
    Database(#[from] rusqlite::Error),

    #[error("Erreur de requête HTTP: {0}")]
    Http(#[from] reqwest::Error),

    #[error("Erreur JSON: {0}")]
    Json(#[from] serde_json::Error),

    #[error("Erreur de chiffrement: {0}")]
    Encryption(String),

    #[error("Introuvable: {0}")]
    NotFound(String),

    #[error("Erreur de validation: {0}")]
    Validation(String),

    #[error("Erreur du fournisseur: {0}")]
    Provider(String),

    #[error("{0}")]
    Internal(String),
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
