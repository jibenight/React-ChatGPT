use serde::Deserialize;
use validator::Validate;

#[derive(Debug, Deserialize, Validate)]
pub struct CreateProjectRequest {
    #[validate(length(min = 1, max = 255))]
    pub name: String,
    pub description: Option<String>,
    pub instructions: Option<String>,
    pub context_data: Option<String>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateProjectRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub instructions: Option<String>,
    pub context_data: Option<String>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct ProjectIdParam {
    pub project_id: i64,
}

#[derive(Debug, Deserialize, Validate)]
pub struct AddMemberRequest {
    #[validate(email)]
    pub email: String,
    #[validate(length(min = 1))]
    pub role: String,
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateMemberRoleRequest {
    #[validate(length(min = 1))]
    pub role: String,
}

#[derive(Debug, Deserialize, Validate)]
pub struct MemberParam {
    pub project_id: i64,
    pub user_id: i64,
}
