use crate::{handlers, middleware::auth::require_auth, state::AppState};
use axum::{
  middleware,
  routing::{get, post},
  Router,
};

pub fn router(state: AppState) -> Router<AppState> {
  // Webhook route — raw body, no auth, no CSRF
  let public = Router::new()
    .route("/api/billing/webhook", post(handlers::billing::handle_webhook));

  let protected = Router::new()
    .route(
      "/api/billing/create-checkout-session",
      post(handlers::billing::create_checkout_session),
    )
    .route(
      "/api/billing/create-portal-session",
      post(handlers::billing::create_portal_session),
    )
    .route(
      "/api/billing/subscription",
      get(handlers::billing::get_subscription),
    )
    .route(
      "/api/billing/activate-license",
      post(handlers::billing::activate_license),
    )
    .route_layer(middleware::from_fn_with_state(state, require_auth));

  public.merge(protected)
}
