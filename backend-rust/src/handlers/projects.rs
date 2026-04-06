use crate::{
    db::DbPool,
    dto::projects::{
        AddMemberRequest, CreateProjectRequest, MemberParam, ProjectIdParam,
        UpdateMemberRoleRequest, UpdateProjectRequest,
    },
    error::AppError,
    extractors::{AuthUser, ValidatedJson, ValidatedPath},
    state::AppState,
};
use axum::{extract::State, response::IntoResponse, Json};
use serde_json::json;

async fn get_user_role(
    db: &DbPool,
    project_id: i64,
    user_id: i64,
) -> Result<Option<String>, AppError> {
    #[derive(sqlx::FromRow)]
    struct RoleRow {
        role: String,
    }

    Ok(match db {
        DbPool::Sqlite(pool) => {
            sqlx::query_as::<_, RoleRow>(
                "SELECT role FROM project_members WHERE project_id = ? AND user_id = ? LIMIT 1",
            )
            .bind(project_id)
            .bind(user_id)
            .fetch_optional(pool)
            .await?
            .map(|r| r.role)
        }
        DbPool::Postgres(pool) => {
            sqlx::query_as::<_, RoleRow>(
                "SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2 LIMIT 1",
            )
            .bind(project_id)
            .bind(user_id)
            .fetch_optional(pool)
            .await?
            .map(|r| r.role)
        }
    })
}

pub async fn list_projects(
    State(state): State<AppState>,
    auth: AuthUser,
) -> Result<impl IntoResponse, AppError> {
    #[derive(sqlx::FromRow, serde::Serialize)]
    struct ProjectRow {
        id: i64,
        name: String,
        description: Option<String>,
        instructions: Option<String>,
        context_data: Option<String>,
        created_at: String,
        updated_at: String,
        member_role: String,
    }

    let rows: Vec<ProjectRow> = match &state.db {
        DbPool::Sqlite(pool) => {
            sqlx::query_as::<_, ProjectRow>(
                "SELECT p.id, p.name, p.description, p.instructions, p.context_data,
                        p.created_at, p.updated_at, pm.role AS member_role
                 FROM projects p
                 INNER JOIN project_members pm ON pm.project_id = p.id
                 WHERE pm.user_id = ?
                 ORDER BY p.updated_at DESC",
            )
            .bind(auth.id)
            .fetch_all(pool)
            .await?
        }
        DbPool::Postgres(pool) => {
            sqlx::query_as::<_, ProjectRow>(
                "SELECT p.id, p.name, p.description, p.instructions, p.context_data,
                        p.created_at, p.updated_at, pm.role AS member_role
                 FROM projects p
                 INNER JOIN project_members pm ON pm.project_id = p.id
                 WHERE pm.user_id = $1
                 ORDER BY p.updated_at DESC",
            )
            .bind(auth.id)
            .fetch_all(pool)
            .await?
        }
    };

    Ok(Json(rows))
}

pub async fn create_project(
    State(state): State<AppState>,
    auth: AuthUser,
    ValidatedJson(body): ValidatedJson<CreateProjectRequest>,
) -> Result<impl IntoResponse, AppError> {
    let name = body.name.trim().to_string();
    let description = body.description.as_deref().map(|s| s.trim().to_string());
    let instructions = body.instructions.as_deref().map(|s| s.trim().to_string());
    let context_data = body.context_data.as_deref().map(|s| s.trim().to_string());

    let project_id: i64 = match &state.db {
        DbPool::Sqlite(pool) => {
            let result = sqlx::query(
                "INSERT INTO projects (user_id, name, description, instructions, context_data)
                 VALUES (?, ?, ?, ?, ?)",
            )
            .bind(auth.id)
            .bind(&name)
            .bind(&description)
            .bind(&instructions)
            .bind(&context_data)
            .execute(pool)
            .await?;

            let project_id = result.last_insert_rowid();

            sqlx::query(
                "INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, 'owner')",
            )
            .bind(project_id)
            .bind(auth.id)
            .execute(pool)
            .await?;

            project_id
        }
        DbPool::Postgres(pool) => {
            let row: (i64,) = sqlx::query_as(
                "INSERT INTO projects (user_id, name, description, instructions, context_data)
                 VALUES ($1, $2, $3, $4, $5) RETURNING id",
            )
            .bind(auth.id)
            .bind(&name)
            .bind(&description)
            .bind(&instructions)
            .bind(&context_data)
            .fetch_one(pool)
            .await?;

            let project_id = row.0;

            sqlx::query(
                "INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, 'owner')",
            )
            .bind(project_id)
            .bind(auth.id)
            .execute(pool)
            .await?;

            project_id
        }
    };

    Ok((
        axum::http::StatusCode::CREATED,
        Json(json!({
            "id": project_id,
            "name": name,
            "description": description,
            "instructions": instructions,
            "context_data": context_data,
            "member_role": "owner",
        })),
    ))
}

pub async fn get_project(
    State(state): State<AppState>,
    auth: AuthUser,
    ValidatedPath(params): ValidatedPath<ProjectIdParam>,
) -> Result<impl IntoResponse, AppError> {
    #[derive(sqlx::FromRow, serde::Serialize)]
    struct ProjectRow {
        id: i64,
        name: String,
        description: Option<String>,
        instructions: Option<String>,
        context_data: Option<String>,
        created_at: String,
        updated_at: String,
        member_role: String,
    }

    let row: Option<ProjectRow> = match &state.db {
        DbPool::Sqlite(pool) => {
            sqlx::query_as::<_, ProjectRow>(
                "SELECT p.id, p.name, p.description, p.instructions, p.context_data,
                        p.created_at, p.updated_at, pm.role AS member_role
                 FROM projects p
                 INNER JOIN project_members pm ON pm.project_id = p.id
                 WHERE p.id = ? AND pm.user_id = ?",
            )
            .bind(params.project_id)
            .bind(auth.id)
            .fetch_optional(pool)
            .await?
        }
        DbPool::Postgres(pool) => {
            sqlx::query_as::<_, ProjectRow>(
                "SELECT p.id, p.name, p.description, p.instructions, p.context_data,
                        p.created_at, p.updated_at, pm.role AS member_role
                 FROM projects p
                 INNER JOIN project_members pm ON pm.project_id = p.id
                 WHERE p.id = $1 AND pm.user_id = $2",
            )
            .bind(params.project_id)
            .bind(auth.id)
            .fetch_optional(pool)
            .await?
        }
    };

    match row {
        Some(p) => Ok(Json(p)),
        None => Err(AppError::NotFound("Project not found".to_string())),
    }
}

pub async fn update_project(
    State(state): State<AppState>,
    auth: AuthUser,
    ValidatedPath(params): ValidatedPath<ProjectIdParam>,
    ValidatedJson(body): ValidatedJson<UpdateProjectRequest>,
) -> Result<impl IntoResponse, AppError> {
    let role = get_user_role(&state.db, params.project_id, auth.id).await?;
    let role = match role {
        Some(r) => r,
        None => return Err(AppError::NotFound("Project not found".to_string())),
    };

    if role != "owner" && role != "editor" {
        return Err(AppError::Forbidden);
    }

    let name = body.name.as_deref().map(|s| s.trim().to_string());
    let description = body.description.as_deref().map(|s| s.trim().to_string());
    let instructions = body.instructions.as_deref().map(|s| s.trim().to_string());
    let context_data = body.context_data.as_deref().map(|s| s.trim().to_string());

    if name.is_none() && description.is_none() && instructions.is_none() && context_data.is_none()
    {
        return Err(AppError::BadRequest("No fields to update".to_string()));
    }

    // Build update query dynamically
    match &state.db {
        DbPool::Sqlite(pool) => {
            let mut set_parts: Vec<&str> = Vec::new();
            if name.is_some() {
                set_parts.push("name = ?");
            }
            if description.is_some() {
                set_parts.push("description = ?");
            }
            if instructions.is_some() {
                set_parts.push("instructions = ?");
            }
            if context_data.is_some() {
                set_parts.push("context_data = ?");
            }
            let set_clause = set_parts.join(", ");
            let sql = format!(
                "UPDATE projects SET {}, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                set_clause
            );

            let mut q = sqlx::query(&sql);
            if let Some(ref v) = name {
                q = q.bind(v);
            }
            if let Some(ref v) = description {
                q = q.bind(v);
            }
            if let Some(ref v) = instructions {
                q = q.bind(v);
            }
            if let Some(ref v) = context_data {
                q = q.bind(v);
            }
            q.bind(params.project_id).execute(pool).await?;
        }
        DbPool::Postgres(pool) => {
            let mut set_parts: Vec<String> = Vec::new();
            let mut idx = 1i32;
            if name.is_some() {
                set_parts.push(format!("name = ${}", idx));
                idx += 1;
            }
            if description.is_some() {
                set_parts.push(format!("description = ${}", idx));
                idx += 1;
            }
            if instructions.is_some() {
                set_parts.push(format!("instructions = ${}", idx));
                idx += 1;
            }
            if context_data.is_some() {
                set_parts.push(format!("context_data = ${}", idx));
                idx += 1;
            }
            let set_clause = set_parts.join(", ");
            let sql = format!(
                "UPDATE projects SET {}, updated_at = CURRENT_TIMESTAMP WHERE id = ${}",
                set_clause, idx
            );

            let mut q = sqlx::query(&sql);
            if let Some(ref v) = name {
                q = q.bind(v);
            }
            if let Some(ref v) = description {
                q = q.bind(v);
            }
            if let Some(ref v) = instructions {
                q = q.bind(v);
            }
            if let Some(ref v) = context_data {
                q = q.bind(v);
            }
            q.bind(params.project_id).execute(pool).await?;
        }
    }

    Ok(Json(json!({ "message": "Project updated" })))
}

pub async fn delete_project(
    State(state): State<AppState>,
    auth: AuthUser,
    ValidatedPath(params): ValidatedPath<ProjectIdParam>,
) -> Result<impl IntoResponse, AppError> {
    let role = get_user_role(&state.db, params.project_id, auth.id).await?;
    match role.as_deref() {
        None => return Err(AppError::NotFound("Project not found".to_string())),
        Some(r) if r != "owner" => return Err(AppError::Forbidden),
        _ => {}
    }

    match &state.db {
        DbPool::Sqlite(pool) => {
            sqlx::query("DELETE FROM projects WHERE id = ?")
                .bind(params.project_id)
                .execute(pool)
                .await?;
        }
        DbPool::Postgres(pool) => {
            sqlx::query("DELETE FROM projects WHERE id = $1")
                .bind(params.project_id)
                .execute(pool)
                .await?;
        }
    }

    Ok(Json(json!({ "message": "Project deleted" })))
}

pub async fn get_members(
    State(state): State<AppState>,
    auth: AuthUser,
    ValidatedPath(params): ValidatedPath<ProjectIdParam>,
) -> Result<impl IntoResponse, AppError> {
    let role = get_user_role(&state.db, params.project_id, auth.id).await?;
    if role.is_none() {
        return Err(AppError::NotFound("Project not found".to_string()));
    }

    #[derive(sqlx::FromRow, serde::Serialize)]
    struct MemberRow {
        user_id: i64,
        username: String,
        email: String,
        role: String,
        invited_at: String,
    }

    let rows: Vec<MemberRow> = match &state.db {
        DbPool::Sqlite(pool) => {
            sqlx::query_as::<_, MemberRow>(
                "SELECT u.id AS user_id, u.username, u.email, pm.role, pm.invited_at
                 FROM project_members pm
                 INNER JOIN users u ON u.id = pm.user_id
                 WHERE pm.project_id = ?
                 ORDER BY pm.invited_at ASC",
            )
            .bind(params.project_id)
            .fetch_all(pool)
            .await?
        }
        DbPool::Postgres(pool) => {
            sqlx::query_as::<_, MemberRow>(
                "SELECT u.id AS user_id, u.username, u.email, pm.role, pm.invited_at
                 FROM project_members pm
                 INNER JOIN users u ON u.id = pm.user_id
                 WHERE pm.project_id = $1
                 ORDER BY pm.invited_at ASC",
            )
            .bind(params.project_id)
            .fetch_all(pool)
            .await?
        }
    };

    Ok(Json(rows))
}

pub async fn add_member(
    State(state): State<AppState>,
    auth: AuthUser,
    ValidatedPath(params): ValidatedPath<ProjectIdParam>,
    ValidatedJson(body): ValidatedJson<AddMemberRequest>,
) -> Result<impl IntoResponse, AppError> {
    let caller_role = get_user_role(&state.db, params.project_id, auth.id).await?;
    match caller_role.as_deref() {
        None => return Err(AppError::NotFound("Project not found".to_string())),
        Some(r) if r != "owner" => return Err(AppError::Forbidden),
        _ => {}
    }

    #[derive(sqlx::FromRow)]
    struct UserRow {
        id: i64,
        username: String,
        email: String,
    }

    let email = body.email.trim().to_lowercase();
    let target: Option<UserRow> = match &state.db {
        DbPool::Sqlite(pool) => {
            sqlx::query_as::<_, UserRow>(
                "SELECT id, username, email FROM users WHERE email = ? LIMIT 1",
            )
            .bind(&email)
            .fetch_optional(pool)
            .await?
        }
        DbPool::Postgres(pool) => {
            sqlx::query_as::<_, UserRow>(
                "SELECT id, username, email FROM users WHERE email = $1 LIMIT 1",
            )
            .bind(&email)
            .fetch_optional(pool)
            .await?
        }
    };

    let target = match target {
        Some(u) => u,
        None => return Err(AppError::NotFound("User not found".to_string())),
    };

    if target.id == auth.id {
        return Err(AppError::BadRequest(
            "Cannot add yourself as member".to_string(),
        ));
    }

    let existing = get_user_role(&state.db, params.project_id, target.id).await?;
    if existing.is_some() {
        return Err(AppError::BadRequest("User is already a member".to_string()));
    }

    match &state.db {
        DbPool::Sqlite(pool) => {
            sqlx::query(
                "INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)",
            )
            .bind(params.project_id)
            .bind(target.id)
            .bind(&body.role)
            .execute(pool)
            .await?;
        }
        DbPool::Postgres(pool) => {
            sqlx::query(
                "INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3)",
            )
            .bind(params.project_id)
            .bind(target.id)
            .bind(&body.role)
            .execute(pool)
            .await?;
        }
    }

    Ok((
        axum::http::StatusCode::CREATED,
        Json(json!({
            "user_id": target.id,
            "username": target.username,
            "email": target.email,
            "role": body.role,
        })),
    ))
}

pub async fn update_member_role(
    State(state): State<AppState>,
    auth: AuthUser,
    ValidatedPath(params): ValidatedPath<MemberParam>,
    ValidatedJson(body): ValidatedJson<UpdateMemberRoleRequest>,
) -> Result<impl IntoResponse, AppError> {
    let caller_role = get_user_role(&state.db, params.project_id, auth.id).await?;
    match caller_role.as_deref() {
        None => return Err(AppError::NotFound("Project not found".to_string())),
        Some(r) if r != "owner" => return Err(AppError::Forbidden),
        _ => {}
    }

    if params.user_id == auth.id {
        return Err(AppError::BadRequest(
            "Cannot change your own role".to_string(),
        ));
    }

    let target_role = get_user_role(&state.db, params.project_id, params.user_id).await?;
    if target_role.is_none() {
        return Err(AppError::NotFound("Member not found".to_string()));
    }

    match &state.db {
        DbPool::Sqlite(pool) => {
            sqlx::query(
                "UPDATE project_members SET role = ? WHERE project_id = ? AND user_id = ?",
            )
            .bind(&body.role)
            .bind(params.project_id)
            .bind(params.user_id)
            .execute(pool)
            .await?;
        }
        DbPool::Postgres(pool) => {
            sqlx::query(
                "UPDATE project_members SET role = $1 WHERE project_id = $2 AND user_id = $3",
            )
            .bind(&body.role)
            .bind(params.project_id)
            .bind(params.user_id)
            .execute(pool)
            .await?;
        }
    }

    Ok(Json(json!({ "message": "Member role updated" })))
}

pub async fn remove_member(
    State(state): State<AppState>,
    auth: AuthUser,
    ValidatedPath(params): ValidatedPath<MemberParam>,
) -> Result<impl IntoResponse, AppError> {
    let caller_role = get_user_role(&state.db, params.project_id, auth.id).await?;
    match caller_role.as_deref() {
        None => return Err(AppError::NotFound("Project not found".to_string())),
        Some(r) if r != "owner" => return Err(AppError::Forbidden),
        _ => {}
    }

    if params.user_id == auth.id {
        return Err(AppError::BadRequest(
            "Cannot remove yourself from the project".to_string(),
        ));
    }

    let target_role = get_user_role(&state.db, params.project_id, params.user_id).await?;
    if target_role.is_none() {
        return Err(AppError::NotFound("Member not found".to_string()));
    }

    match &state.db {
        DbPool::Sqlite(pool) => {
            sqlx::query(
                "DELETE FROM project_members WHERE project_id = ? AND user_id = ?",
            )
            .bind(params.project_id)
            .bind(params.user_id)
            .execute(pool)
            .await?;
        }
        DbPool::Postgres(pool) => {
            sqlx::query(
                "DELETE FROM project_members WHERE project_id = $1 AND user_id = $2",
            )
            .bind(params.project_id)
            .bind(params.user_id)
            .execute(pool)
            .await?;
        }
    }

    Ok(Json(json!({ "message": "Member removed" })))
}
