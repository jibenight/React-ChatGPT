use crate::db::adapter::DbPool;
use crate::error::AppError;
use crate::models::message::SearchResult;

pub async fn search_messages(
    pool: &DbPool,
    user_id: i64,
    query: &str,
    limit: i64,
    offset: i64,
) -> Result<Vec<SearchResult>, AppError> {
    match pool {
        DbPool::Sqlite(p) => sqlite_search(p, user_id, query, limit, offset).await,
        DbPool::Postgres(p) => postgres_search(p, user_id, query, limit, offset).await,
    }
}

async fn sqlite_search(
    pool: &sqlx::SqlitePool,
    user_id: i64,
    query: &str,
    limit: i64,
    offset: i64,
) -> Result<Vec<SearchResult>, AppError> {
    // FTS5: snippet() highlights matched terms. rank is the FTS relevance score.
    let rows = sqlx::query_as::<_, SearchResult>(
        r#"
        SELECT
            m.id,
            m.thread_id,
            m.role,
            snippet(messages_fts, 0, '<mark>', '</mark>', '...', 32) AS content,
            m.created_at,
            f.rank AS rank
        FROM messages_fts f
        JOIN messages m ON m.id = f.rowid
        JOIN threads t ON t.id = m.thread_id
        WHERE messages_fts MATCH ?
          AND t.user_id = ?
        ORDER BY f.rank
        LIMIT ? OFFSET ?
        "#,
    )
    .bind(query)
    .bind(user_id)
    .bind(limit)
    .bind(offset)
    .fetch_all(pool)
    .await?;

    Ok(rows)
}

async fn postgres_search(
    pool: &sqlx::PgPool,
    user_id: i64,
    query: &str,
    limit: i64,
    offset: i64,
) -> Result<Vec<SearchResult>, AppError> {
    // PostgreSQL full-text search using tsvector + plainto_tsquery.
    // ts_headline generates highlighted snippets.
    // ts_rank orders by relevance descending.
    let rows = sqlx::query_as::<_, SearchResult>(
        r#"
        SELECT
            m.id,
            m.thread_id,
            m.role,
            ts_headline('french', m.content, plainto_tsquery('french', $1)) AS content,
            m.created_at::TEXT AS created_at,
            ts_rank(to_tsvector('french', m.content), plainto_tsquery('french', $1))::FLOAT8 AS rank
        FROM messages m
        JOIN threads t ON t.id = m.thread_id
        WHERE to_tsvector('french', m.content) @@ plainto_tsquery('french', $1)
          AND t.user_id = $2
        ORDER BY rank DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(query)
    .bind(user_id)
    .bind(limit)
    .bind(offset)
    .fetch_all(pool)
    .await?;

    Ok(rows)
}
