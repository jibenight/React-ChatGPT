# chatgpt-backend (Rust)

High-performance Rust rewrite of the Express 4 backend.
Stack: **Axum 0.8** · **SQLx 0.8** (SQLite / PostgreSQL) · **Tokio 1** · **tower-http**.

## Features

- Multi-provider AI chat streaming (OpenAI, Gemini, Claude, Mistral, Groq)
- JWT authentication via HttpOnly cookie
- CSRF double-submit protection
- AES-256-GCM API key encryption (scrypt KDF)
- Stripe billing (checkout, portal, webhook, license activation)
- Plan feature gates (message/project/thread/provider limits)
- DB-backed rate limiting
- Full-text search
- Graceful shutdown

## Prerequisites

- Rust 1.82+ (`rustup update stable`)
- SQLite3 dev headers (or PostgreSQL for production)

```bash
# macOS
brew install sqlite

# Debian/Ubuntu
apt-get install libsqlite3-dev
```

## Development

### 1. Configure environment

```bash
cp .env.example .env
# Edit .env and set at minimum:
#   SECRET_KEY      (32+ chars)
#   ENCRYPTION_KEY  (32+ chars)
```

### 2. Run in dev mode

```bash
cargo run
# or with auto-reload via cargo-watch:
cargo install cargo-watch
cargo watch -x run
```

The server listens on `http://0.0.0.0:3001` by default.

### 3. Dev bypass (no login required)

Set `DEV_BYPASS_AUTH=true` in `.env`. Requests from localhost will be
auto-authenticated as `dev@local`. Send `X-Dev-User-Email` /
`X-Dev-User-Name` headers to override the dev identity.

## Build

```bash
# Debug build
cargo build

# Optimised release build
cargo build --release

# Binary is at target/release/chatgpt-backend
```

## Lint & format

```bash
cargo clippy -- -W warnings   # lints (zero warnings expected)
cargo fmt                     # format
```

## Tests

```bash
cargo test                    # all unit + integration tests
cargo test -- --nocapture     # with stdout
cargo test <name>             # run a single test by name pattern
```

Test coverage:

| Module | Tests |
|---|---|
| `services::encryption` | roundtrip, different IV, legacy detection, corruption |
| `services::api_key_cache` | set/get, TTL, invalidation, concurrent access |
| `services::rate_limit_store` | increment, limit, window expiry, cleanup |
| `dto` validation | RegisterRequest, LoginRequest, ResetPassword, ApiKey, Billing |
| `error` responses | HTTP status codes and JSON bodies for all AppError variants |
| `config` defaults | port, host, DbClient, cookie settings |
| `auth` JWT | creation, verification, expiry, tamper, wrong secret |

## Docker

### Build image

```bash
docker build -t chatgpt-backend .
```

### Run container

```bash
docker run -d \
  --name chatgpt-backend \
  -p 3001:3001 \
  -e SECRET_KEY=your-secret-key-min-32-chars-here \
  -e ENCRYPTION_KEY=your-encryption-key-min-32-chars \
  -v $(pwd)/database:/app/database \
  chatgpt-backend
```

### docker-compose example

```yaml
services:
  backend:
    build: ./backend-rust
    ports:
      - "3001:3001"
    environment:
      SECRET_KEY: ${SECRET_KEY}
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
      NODE_ENV: production
      DB_CLIENT: sqlite
      SQLITE_DB_PATH: /app/database/ChatData.db
      CORS_ALLOWED_ORIGINS: https://your-domain.com
    volumes:
      - db_data:/app/database
    restart: unless-stopped

volumes:
  db_data:
```

## Environment variables

See [`.env.example`](.env.example) for all documented variables.

| Variable | Required | Default | Description |
|---|---|---|---|
| `SECRET_KEY` | yes | — | JWT signing secret (32+ chars) |
| `ENCRYPTION_KEY` | yes | — | AES-256 key for API key encryption (32+ chars) |
| `PORT` | no | `3001` | TCP port to listen on |
| `HOST` | no | `0.0.0.0` | Bind address |
| `NODE_ENV` | no | `development` | `development` or `production` |
| `DB_CLIENT` | no | `sqlite` | `sqlite` or `postgres` |
| `SQLITE_DB_PATH` | no | `database/ChatData.db` | SQLite file path |
| `DATABASE_URL` | if postgres | — | PostgreSQL connection string |
| `CORS_ALLOWED_ORIGINS` | no | `APP_URL` | Comma-separated origins |
| `DEV_BYPASS_AUTH` | no | `false` | Skip auth for localhost requests |

## Architecture

```
src/
├── main.rs          # Entry point: env, tracing, DB, state, background tasks
├── app.rs           # Router assembly + middleware stack
├── config.rs        # AppConfig loaded from env vars
├── state.rs         # AppState (DB, config, cache, mailer, HTTP client)
├── error.rs         # AppError enum + IntoResponse
├── db/              # DbPool (SQLite + PostgreSQL), schema migrations
├── dto/             # Zod-equivalent: Serde + validator derive macros
├── extractors/      # AuthUser, ValidatedJson, ValidatedPath, ValidatedQuery
├── handlers/        # Business logic (auth, users, projects, threads, chat, billing, search)
├── middleware/       # auth, CORS, CSRF, security headers, rate limit, request ID
├── models/          # sqlx FromRow structs
├── providers/       # AI provider SDK wrappers (OpenAI, Gemini, Claude, Mistral, Groq)
├── routes/          # Axum Router builders per domain
├── services/        # encryption, API key cache, mailer, rate limit store, cleanup
└── tests/           # Integration test modules
```

## API

See the main [CLAUDE.md](../CLAUDE.md) for the full route reference. The Rust backend
implements the same API surface as the Node.js backend.

Health check:

```
GET /healthz
→ { "status": "ok", "db": "connected", "uptime": 1234, "timestamp": "..." }
```
