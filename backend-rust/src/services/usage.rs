use crate::db::DbPool;
use anyhow::Result;

/// Upsert today's message count for the given user (+1).
pub async fn increment_daily_usage(db: &DbPool, user_id: i64) -> Result<()> {
  match db {
    DbPool::Sqlite(pool) => {
      sqlx::query(
        "INSERT INTO usage_daily (user_id, date, message_count)
         VALUES (?, DATE('now'), 1)
         ON CONFLICT (user_id, date)
         DO UPDATE SET message_count = message_count + 1",
      )
      .bind(user_id)
      .execute(pool)
      .await?;
    }
    DbPool::Postgres(pool) => {
      sqlx::query(
        "INSERT INTO usage_daily (user_id, date, message_count)
         VALUES ($1, CURRENT_DATE, 1)
         ON CONFLICT (user_id, date)
         DO UPDATE SET message_count = usage_daily.message_count + 1",
      )
      .bind(user_id)
      .execute(pool)
      .await?;
    }
  }
  Ok(())
}

/// Get today's message count for the given user.
pub async fn get_daily_usage(db: &DbPool, user_id: i64) -> Result<i32> {
  #[derive(sqlx::FromRow)]
  struct Row {
    message_count: i32,
  }

  let count = match db {
    DbPool::Sqlite(pool) => {
      sqlx::query_as::<_, Row>(
        "SELECT message_count FROM usage_daily WHERE user_id = ? AND date = DATE('now') LIMIT 1",
      )
      .bind(user_id)
      .fetch_optional(pool)
      .await?
      .map(|r| r.message_count)
      .unwrap_or(0)
    }
    DbPool::Postgres(pool) => {
      sqlx::query_as::<_, Row>(
        "SELECT message_count FROM usage_daily WHERE user_id = $1 AND date = CURRENT_DATE LIMIT 1",
      )
      .bind(user_id)
      .fetch_optional(pool)
      .await?
      .map(|r| r.message_count)
      .unwrap_or(0)
    }
  };

  Ok(count)
}
