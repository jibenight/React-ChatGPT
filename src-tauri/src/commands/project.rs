use serde::{Deserialize, Serialize};
use tauri::State;

use crate::error::AppError;
use crate::state::AppState;

#[derive(Debug, Serialize)]
pub struct Project {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub instructions: Option<String>,
    pub context_data: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[tauri::command]
pub fn list_projects(state: State<'_, AppState>) -> Result<Vec<Project>, AppError> {
    let db = state.db.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    let mut stmt = db.prepare(
        "SELECT id, name, description, instructions, context_data, created_at, updated_at
         FROM projects WHERE user_id = 1
         ORDER BY updated_at DESC",
    )?;
    let projects = stmt
        .query_map([], |row| {
            Ok(Project {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                instructions: row.get(3)?,
                context_data: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })?
        .filter_map(|r| r.ok())
        .collect();
    Ok(projects)
}

#[tauri::command]
pub fn get_project(
    state: State<'_, AppState>,
    project_id: i64,
) -> Result<Project, AppError> {
    let db = state.db.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    let project = db.query_row(
        "SELECT id, name, description, instructions, context_data, created_at, updated_at
         FROM projects WHERE id = ?1 AND user_id = 1",
        rusqlite::params![project_id],
        |row| {
            Ok(Project {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                instructions: row.get(3)?,
                context_data: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        },
    ).map_err(|_| AppError::NotFound("Projet introuvable.".into()))?;
    Ok(project)
}

#[derive(Debug, Deserialize)]
pub struct CreateProjectInput {
    pub name: String,
    pub description: Option<String>,
    pub instructions: Option<String>,
    pub context_data: Option<String>,
}

#[tauri::command]
pub fn create_project(
    state: State<'_, AppState>,
    input: CreateProjectInput,
) -> Result<Project, AppError> {
    if input.name.is_empty() || input.name.len() > 200 {
        return Err(AppError::Validation(
            "Le nom du projet doit contenir entre 1 et 200 caractères.".into(),
        ));
    }
    let db = state.db.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    db.execute(
        "INSERT INTO projects (user_id, name, description, instructions, context_data)
         VALUES (1, ?1, ?2, ?3, ?4)",
        rusqlite::params![
            input.name,
            input.description,
            input.instructions,
            input.context_data,
        ],
    )?;
    let id = db.last_insert_rowid();
    drop(db);
    get_project(state, id)
}

#[derive(Debug, Deserialize)]
pub struct UpdateProjectInput {
    pub name: Option<String>,
    pub description: Option<String>,
    pub instructions: Option<String>,
    pub context_data: Option<String>,
}

#[tauri::command]
pub fn update_project(
    state: State<'_, AppState>,
    project_id: i64,
    input: UpdateProjectInput,
) -> Result<(), AppError> {
    if let Some(ref name) = input.name {
        if name.is_empty() || name.len() > 200 {
            return Err(AppError::Validation(
                "Le nom du projet doit contenir entre 1 et 200 caractères.".into(),
            ));
        }
    }

    let db = state.db.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    let mut sets = Vec::new();
    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    let mut idx = 1;

    if let Some(ref name) = input.name {
        sets.push(format!("name = ?{idx}"));
        params.push(Box::new(name.clone()));
        idx += 1;
    }
    if let Some(ref desc) = input.description {
        sets.push(format!("description = ?{idx}"));
        params.push(Box::new(desc.clone()));
        idx += 1;
    }
    if let Some(ref inst) = input.instructions {
        sets.push(format!("instructions = ?{idx}"));
        params.push(Box::new(inst.clone()));
        idx += 1;
    }
    if let Some(ref ctx) = input.context_data {
        sets.push(format!("context_data = ?{idx}"));
        params.push(Box::new(ctx.clone()));
        idx += 1;
    }

    if sets.is_empty() {
        return Ok(());
    }

    sets.push(format!("updated_at = CURRENT_TIMESTAMP"));
    let sql = format!(
        "UPDATE projects SET {} WHERE id = ?{} AND user_id = 1",
        sets.join(", "),
        idx
    );
    params.push(Box::new(project_id));
    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    db.execute(&sql, param_refs.as_slice())?;
    Ok(())
}

#[tauri::command]
pub fn delete_project(
    state: State<'_, AppState>,
    project_id: i64,
) -> Result<(), AppError> {
    let db = state.db.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    db.execute(
        "DELETE FROM projects WHERE id = ?1 AND user_id = 1",
        rusqlite::params![project_id],
    )?;
    Ok(())
}
