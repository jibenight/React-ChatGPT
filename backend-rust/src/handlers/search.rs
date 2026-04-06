use crate::{
    db,
    dto::search::SearchQuery,
    error::AppError,
    extractors::{AuthUser, ValidatedQuery},
    middleware::rate_limit::check_rate_limit,
    state::AppState,
};
use axum::{extract::State, response::IntoResponse, Json};
use serde_json::json;

pub async fn search(
    State(state): State<AppState>,
    auth: AuthUser,
    ValidatedQuery(query): ValidatedQuery<SearchQuery>,
) -> Result<impl IntoResponse, AppError> {
    // Rate limit: 30 requests per minute per user.
    let rl_key = format!("search:{}", auth.id);
    check_rate_limit(&state.db, &rl_key, 30, 60_000).await?;

    let limit = query.limit.unwrap_or(20).clamp(1, 50);
    let offset = query.offset.unwrap_or(0).max(0);

    let results =
        db::search::search_messages(&state.db, auth.id, &query.q, limit, offset).await?;

    Ok(Json(json!({
        "results": results,
        "total": results.len(),
    })))
}
