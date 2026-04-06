use crate::config::AppConfig;
use axum_extra::extract::cookie::{Cookie, CookieJar, SameSite};
use time::Duration;

/// Attach a signed `HttpOnly` auth cookie to the jar.
pub fn set_auth_cookie(jar: CookieJar, token: &str, config: &AppConfig) -> CookieJar {
    let max_age = Duration::days(config.auth_cookie_max_age_days as i64);

    let samesite = match config.auth_cookie_samesite.to_lowercase().as_str() {
        "strict" => SameSite::Strict,
        "none" => SameSite::None,
        _ => SameSite::Lax,
    };

    let mut builder = Cookie::build((config.auth_cookie_name.clone(), token.to_owned()))
        .http_only(true)
        .secure(config.auth_cookie_secure)
        .same_site(samesite)
        .max_age(max_age)
        .path("/");

    if let Some(ref domain) = config.auth_cookie_domain {
        builder = builder.domain(domain.clone());
    }

    jar.add(builder.build())
}

/// Remove the auth cookie by overwriting it with a zero-duration cookie.
pub fn clear_auth_cookie(jar: CookieJar, config: &AppConfig) -> CookieJar {
    let cookie = Cookie::build((config.auth_cookie_name.clone(), ""))
        .http_only(true)
        .secure(config.auth_cookie_secure)
        .max_age(Duration::ZERO)
        .path("/")
        .build();

    jar.remove(cookie)
}
