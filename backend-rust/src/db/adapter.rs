use anyhow::Result;
use sqlx::{sqlite::SqliteConnectOptions, PgPool, SqlitePool};
use std::str::FromStr;

#[derive(Clone)]
pub enum DbPool {
    Sqlite(SqlitePool),
    Postgres(PgPool),
}

impl DbPool {
    pub async fn connect_sqlite(path: &str) -> Result<Self> {
        // Ensure parent directory exists
        if let Some(parent) = std::path::Path::new(path).parent() {
            if !parent.exists() {
                std::fs::create_dir_all(parent)?;
            }
        }

        let opts = SqliteConnectOptions::from_str(&format!("sqlite:{}", path))?
            .create_if_missing(true)
            .foreign_keys(true);

        let pool = SqlitePool::connect_with(opts).await?;
        Ok(DbPool::Sqlite(pool))
    }

    pub async fn connect_postgres(url: &str) -> Result<Self> {
        let pool = PgPool::connect(url).await?;
        Ok(DbPool::Postgres(pool))
    }

    pub fn as_sqlite(&self) -> Option<&SqlitePool> {
        match self {
            DbPool::Sqlite(p) => Some(p),
            _ => None,
        }
    }

    pub fn as_postgres(&self) -> Option<&PgPool> {
        match self {
            DbPool::Postgres(p) => Some(p),
            _ => None,
        }
    }

    pub async fn close(&self) {
        match self {
            DbPool::Sqlite(p) => p.close().await,
            DbPool::Postgres(p) => p.close().await,
        }
    }

    /// Ping the database to verify connectivity.
    pub async fn ping(&self) -> Result<()> {
        match self {
            DbPool::Sqlite(p) => {
                sqlx::query("SELECT 1").execute(p).await?;
            }
            DbPool::Postgres(p) => {
                sqlx::query("SELECT 1").execute(p).await?;
            }
        }
        Ok(())
    }
}
