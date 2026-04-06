# ── Stage 1: Builder ──────────────────────────────────────────────────────────
FROM rust:1.82-slim AS builder

WORKDIR /app

# Install required system libs for sqlx (SQLite) and OpenSSL
RUN apt-get update && apt-get install -y --no-install-recommends \
    pkg-config \
    libssl-dev \
    libsqlite3-dev \
    && rm -rf /var/lib/apt/lists/*

# Cache dependencies: copy manifests first, build a dummy main, then replace.
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo 'fn main() {}' > src/main.rs
RUN cargo build --release --locked
RUN rm -rf src

# Build the real binary
COPY src ./src
# Touch main.rs so cargo detects the change
RUN touch src/main.rs
RUN cargo build --release --locked

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM debian:bookworm-slim AS runtime

WORKDIR /app

# Install runtime deps only (no Rust toolchain)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    libssl3 \
    libsqlite3-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy the compiled binary from the builder stage
COPY --from=builder /app/target/release/chatgpt-backend /app/chatgpt-backend

# Create directory for the SQLite database
RUN mkdir -p /app/database

# Run as non-root user
RUN useradd -m -u 1001 appuser && chown -R appuser:appuser /app
USER appuser

# Default environment (override via docker run -e or docker-compose)
ENV PORT=3001
ENV HOST=0.0.0.0
ENV NODE_ENV=production
ENV DB_CLIENT=sqlite
ENV SQLITE_DB_PATH=/app/database/ChatData.db
ENV LOG_LEVEL=info

EXPOSE 3001

ENTRYPOINT ["/app/chatgpt-backend"]
