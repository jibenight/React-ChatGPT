use serde::Deserialize;
use validator::{Validate, ValidationError};

fn validate_plan(val: &str) -> Result<(), ValidationError> {
  if val == "pro" || val == "team" {
    Ok(())
  } else {
    Err(ValidationError::new("plan must be 'pro' or 'team'"))
  }
}

fn validate_interval(val: &str) -> Result<(), ValidationError> {
  if val == "monthly" || val == "yearly" {
    Ok(())
  } else {
    Err(ValidationError::new("interval must be 'monthly' or 'yearly'"))
  }
}

#[derive(Debug, Deserialize, Validate)]
pub struct CreateCheckoutRequest {
  #[validate(custom(function = "validate_plan"))]
  pub plan: String,
  #[validate(custom(function = "validate_interval"))]
  pub interval: String,
}

#[derive(Debug, Deserialize, Validate)]
pub struct ActivateLicenseRequest {
  #[validate(length(min = 1))]
  pub license_key: String,
}
