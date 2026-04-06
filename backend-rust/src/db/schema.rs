use crate::db::adapter::DbPool;
use anyhow::Result;

/// Initialize all database tables, indexes, and seed data.
pub async fn initialize(pool: &DbPool) -> Result<()> {
    match pool {
        DbPool::Sqlite(p) => initialize_sqlite(p).await,
        DbPool::Postgres(p) => initialize_postgres(p).await,
    }
}

async fn initialize_sqlite(pool: &sqlx::SqlitePool) -> Result<()> {
    sqlx::query("PRAGMA foreign_keys = ON;")
        .execute(pool)
        .await?;

    // users
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            email_verified INTEGER DEFAULT 0
        );",
    )
    .execute(pool)
    .await?;

    // api_keys
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS api_keys (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            provider TEXT NOT NULL DEFAULT 'openai',
            api_key TEXT NOT NULL,
            UNIQUE (user_id, provider),
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        );",
    )
    .execute(pool)
    .await?;

    // password_resets
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS password_resets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL,
            token TEXT NOT NULL,
            expires_at DATETIME NOT NULL
        );",
    )
    .execute(pool)
    .await?;

    // email_verifications
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS email_verifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL,
            token TEXT NOT NULL,
            expires_at DATETIME NOT NULL
        );",
    )
    .execute(pool)
    .await?;

    // plans
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS plans (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            stripe_price_id_monthly TEXT,
            stripe_price_id_yearly TEXT,
            max_projects INTEGER,
            max_threads_per_project INTEGER,
            max_messages_per_day INTEGER,
            max_providers INTEGER,
            collaboration_enabled INTEGER DEFAULT 0,
            local_model_limit INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );",
    )
    .execute(pool)
    .await?;

    // subscriptions
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS subscriptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL UNIQUE,
            plan_id TEXT NOT NULL DEFAULT 'free',
            stripe_customer_id TEXT,
            stripe_subscription_id TEXT,
            status TEXT NOT NULL DEFAULT 'active',
            current_period_start DATETIME,
            current_period_end DATETIME,
            cancel_at_period_end INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
            FOREIGN KEY (plan_id) REFERENCES plans (id)
        );",
    )
    .execute(pool)
    .await?;

    // projects
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            instructions TEXT,
            context_data TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        );",
    )
    .execute(pool)
    .await?;

    // project_members
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS project_members (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            role TEXT NOT NULL DEFAULT 'viewer',
            invited_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(project_id, user_id)
        );",
    )
    .execute(pool)
    .await?;

    // threads
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS threads (
            id TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            project_id INTEGER,
            title TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_message_at DATETIME,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
            FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE SET NULL
        );",
    )
    .execute(pool)
    .await?;

    // messages
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            thread_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            attachments TEXT,
            provider TEXT,
            model TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (thread_id) REFERENCES threads (id) ON DELETE CASCADE
        );",
    )
    .execute(pool)
    .await?;

    // usage_daily
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS usage_daily (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            message_count INTEGER DEFAULT 0,
            UNIQUE(user_id, date),
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        );",
    )
    .execute(pool)
    .await?;

    // desktop_licenses
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS desktop_licenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            license_key TEXT NOT NULL UNIQUE,
            user_id INTEGER,
            email TEXT NOT NULL,
            plan_id TEXT NOT NULL DEFAULT 'pro',
            activated_at DATETIME,
            expires_at DATETIME,
            stripe_payment_id TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
        );",
    )
    .execute(pool)
    .await?;

    // oauth_accounts
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS oauth_accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            provider TEXT NOT NULL,
            provider_user_id TEXT NOT NULL,
            email TEXT,
            name TEXT,
            avatar_url TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(provider, provider_user_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );",
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_oauth_accounts_user ON oauth_accounts(user_id);",
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_oauth_accounts_provider ON oauth_accounts(provider, provider_user_id);",
    )
    .execute(pool)
    .await?;

    // rate_limits
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS rate_limits (
            key TEXT PRIMARY KEY,
            count INTEGER NOT NULL DEFAULT 0,
            window_start INTEGER NOT NULL,
            window_ms INTEGER NOT NULL
        );",
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start);",
    )
    .execute(pool)
    .await?;

    // FTS5 virtual table
    sqlx::query(
        "CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(content, content_rowid=id);",
    )
    .execute(pool)
    .await?;

    // FTS triggers
    sqlx::query(
        "CREATE TRIGGER IF NOT EXISTS messages_ai AFTER INSERT ON messages BEGIN
            INSERT INTO messages_fts(rowid, content) VALUES (new.id, new.content);
        END;",
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE TRIGGER IF NOT EXISTS messages_ad AFTER DELETE ON messages BEGIN
            INSERT INTO messages_fts(messages_fts, rowid, content) VALUES ('delete', old.id, old.content);
        END;",
    )
    .execute(pool)
    .await?;

    // Indexes
    sqlx::query(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_api_keys_user_provider ON api_keys(user_id, provider);",
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_threads_user ON threads(user_id);")
        .execute(pool)
        .await?;

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_threads_user_last_msg ON threads(user_id, last_message_at DESC);",
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_threads_project ON threads(project_id);")
        .execute(pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id);")
        .execute(pool)
        .await?;

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_messages_thread_created ON messages(thread_id, created_at);",
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);")
        .execute(pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);")
        .execute(pool)
        .await?;

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);",
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub ON subscriptions(stripe_subscription_id);",
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);",
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);",
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_usage_daily_user_date ON usage_daily(user_id, date);",
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets(email);",
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);",
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON email_verifications(email);",
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_email_verifications_token ON email_verifications(token);",
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_desktop_licenses_key ON desktop_licenses(license_key);",
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_desktop_licenses_user ON desktop_licenses(user_id);",
    )
    .execute(pool)
    .await?;

    // Seed plans
    sqlx::query(
        "INSERT OR IGNORE INTO plans (id, name, max_projects, max_threads_per_project, max_messages_per_day, max_providers, collaboration_enabled, local_model_limit)
         VALUES ('free', 'Free', 3, 5, 50, 3, 0, 1);",
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "INSERT OR IGNORE INTO plans (id, name, max_projects, max_threads_per_project, max_messages_per_day, max_providers, collaboration_enabled, local_model_limit)
         VALUES ('pro', 'Pro', NULL, NULL, NULL, NULL, 0, NULL);",
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "INSERT OR IGNORE INTO plans (id, name, max_projects, max_threads_per_project, max_messages_per_day, max_providers, collaboration_enabled, local_model_limit)
         VALUES ('team', 'Team', NULL, NULL, NULL, NULL, 1, NULL);",
    )
    .execute(pool)
    .await?;

    // Backfill FTS
    sqlx::query(
        "INSERT OR IGNORE INTO messages_fts(rowid, content) SELECT id, content FROM messages;",
    )
    .execute(pool)
    .await?;

    tracing::info!("SQLite schema initialized");
    Ok(())
}

async fn initialize_postgres(pool: &sqlx::PgPool) -> Result<()> {
    // users
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS users (
            id BIGSERIAL PRIMARY KEY,
            username TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            email_verified INTEGER DEFAULT 0
        );",
    )
    .execute(pool)
    .await?;

    // api_keys
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS api_keys (
            id BIGSERIAL PRIMARY KEY,
            user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            provider TEXT NOT NULL DEFAULT 'openai',
            api_key TEXT NOT NULL,
            UNIQUE (user_id, provider)
        );",
    )
    .execute(pool)
    .await?;

    // password_resets
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS password_resets (
            id BIGSERIAL PRIMARY KEY,
            email TEXT NOT NULL,
            token TEXT NOT NULL,
            expires_at TIMESTAMPTZ NOT NULL
        );",
    )
    .execute(pool)
    .await?;

    // email_verifications
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS email_verifications (
            id BIGSERIAL PRIMARY KEY,
            email TEXT NOT NULL,
            token TEXT NOT NULL,
            expires_at TIMESTAMPTZ NOT NULL
        );",
    )
    .execute(pool)
    .await?;

    // plans
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS plans (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            stripe_price_id_monthly TEXT,
            stripe_price_id_yearly TEXT,
            max_projects INTEGER,
            max_threads_per_project INTEGER,
            max_messages_per_day INTEGER,
            max_providers INTEGER,
            collaboration_enabled INTEGER DEFAULT 0,
            local_model_limit INTEGER,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );",
    )
    .execute(pool)
    .await?;

    // subscriptions
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS subscriptions (
            id BIGSERIAL PRIMARY KEY,
            user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
            plan_id TEXT NOT NULL DEFAULT 'free' REFERENCES plans(id),
            stripe_customer_id TEXT,
            stripe_subscription_id TEXT,
            status TEXT NOT NULL DEFAULT 'active',
            current_period_start TIMESTAMPTZ,
            current_period_end TIMESTAMPTZ,
            cancel_at_period_end INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );",
    )
    .execute(pool)
    .await?;

    // projects
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS projects (
            id BIGSERIAL PRIMARY KEY,
            user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            description TEXT,
            instructions TEXT,
            context_data TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );",
    )
    .execute(pool)
    .await?;

    // project_members
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS project_members (
            id BIGSERIAL PRIMARY KEY,
            project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            role TEXT NOT NULL DEFAULT 'viewer',
            invited_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(project_id, user_id)
        );",
    )
    .execute(pool)
    .await?;

    // threads
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS threads (
            id TEXT PRIMARY KEY,
            user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            project_id BIGINT REFERENCES projects(id) ON DELETE SET NULL,
            title TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            last_message_at TIMESTAMPTZ
        );",
    )
    .execute(pool)
    .await?;

    // messages
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS messages (
            id BIGSERIAL PRIMARY KEY,
            thread_id TEXT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            attachments TEXT,
            provider TEXT,
            model TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );",
    )
    .execute(pool)
    .await?;

    // usage_daily
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS usage_daily (
            id BIGSERIAL PRIMARY KEY,
            user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            date TEXT NOT NULL,
            message_count INTEGER DEFAULT 0,
            UNIQUE(user_id, date)
        );",
    )
    .execute(pool)
    .await?;

    // desktop_licenses
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS desktop_licenses (
            id BIGSERIAL PRIMARY KEY,
            license_key TEXT NOT NULL UNIQUE,
            user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
            email TEXT NOT NULL,
            plan_id TEXT NOT NULL DEFAULT 'pro',
            activated_at TIMESTAMPTZ,
            expires_at TIMESTAMPTZ,
            stripe_payment_id TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );",
    )
    .execute(pool)
    .await?;

    // Indexes
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_threads_user ON threads(user_id);")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_threads_project ON threads(project_id);")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id);")
        .execute(pool)
        .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_messages_thread_created ON messages(thread_id, created_at);",
    )
    .execute(pool)
    .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);")
        .execute(pool)
        .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub ON subscriptions(stripe_subscription_id);",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_usage_daily_user_date ON usage_daily(user_id, date);",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets(email);",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON email_verifications(email);",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_email_verifications_token ON email_verifications(token);",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_desktop_licenses_key ON desktop_licenses(license_key);",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_desktop_licenses_user ON desktop_licenses(user_id);",
    )
    .execute(pool)
    .await?;

    // oauth_accounts
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS oauth_accounts (
            id BIGSERIAL PRIMARY KEY,
            user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            provider TEXT NOT NULL,
            provider_user_id TEXT NOT NULL,
            email TEXT,
            name TEXT,
            avatar_url TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(provider, provider_user_id)
        );",
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_oauth_accounts_user ON oauth_accounts(user_id);",
    )
    .execute(pool)
    .await?;

    // rate_limits
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS rate_limits (
            key TEXT PRIMARY KEY,
            count INTEGER NOT NULL DEFAULT 0,
            window_start BIGINT NOT NULL,
            window_ms BIGINT NOT NULL
        );",
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start);",
    )
    .execute(pool)
    .await?;

    // Seed plans
    sqlx::query(
        "INSERT INTO plans (id, name, max_projects, max_threads_per_project, max_messages_per_day, max_providers, collaboration_enabled, local_model_limit)
         VALUES ('free', 'Free', 3, 5, 50, 3, 0, 1) ON CONFLICT (id) DO NOTHING;",
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "INSERT INTO plans (id, name, max_projects, max_threads_per_project, max_messages_per_day, max_providers, collaboration_enabled, local_model_limit)
         VALUES ('pro', 'Pro', NULL, NULL, NULL, NULL, 0, NULL) ON CONFLICT (id) DO NOTHING;",
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "INSERT INTO plans (id, name, max_projects, max_threads_per_project, max_messages_per_day, max_providers, collaboration_enabled, local_model_limit)
         VALUES ('team', 'Team', NULL, NULL, NULL, NULL, 1, NULL) ON CONFLICT (id) DO NOTHING;",
    )
    .execute(pool)
    .await?;

    tracing::info!("PostgreSQL schema initialized");
    Ok(())
}
