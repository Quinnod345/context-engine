# Deployment Guide

## Quick Start: In-Process

The simplest deployment: import the library and use it directly in your application.

```js
import { ContextEngine } from 'context-engine-ai'

const ctx = new ContextEngine({ dbPath: './context.db' })
// Use ctx.ingest(), ctx.query(), ctx.recent() in your app
```

This uses SQLite with file persistence. The `.db` file survives restarts.

## HTTP Server

Run the context engine as a standalone HTTP service. Useful when multiple processes or services need to share context.

### Via CLI

```bash
# SQLite (default)
npx context-engine serve --port 3334 --db-path ./context.db

# PostgreSQL
npx context-engine serve --port 3334 --storage postgres --pg-url postgresql://user:pass@localhost/mydb

# With OpenAI embeddings
OPENAI_API_KEY=sk-... npx context-engine serve --port 3334 --embeddings openai
```

### Via Code

```js
import { ContextEngine } from 'context-engine-ai'

const ctx = new ContextEngine({
  storage: 'postgres',
  pgConnectionString: process.env.DATABASE_URL,
  embeddingProvider: 'openai',
  openaiApiKey: process.env.OPENAI_API_KEY,
  maxEvents: 5000,
  decayHours: 48,
})

ctx.serve(parseInt(process.env.PORT || '3334'))
```

### CLI Options

```
context-engine serve [options]

Options:
  -p, --port <port>        Port to listen on (default: 3334)
  -s, --storage <type>     Storage backend: sqlite | postgres (default: sqlite)
  --db-path <path>         SQLite database file path (default: context-engine.db)
  --pg-url <url>           PostgreSQL connection string
  --embeddings <type>      Embedding provider: local | openai (default: local)
  --max-events <n>         Maximum events to store (default: 1000)
  --decay-hours <n>        Decay half-life in hours (default: 24)
```

## PostgreSQL Setup

1. Install pgvector:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

2. The context engine will automatically create its `context_events` table on first use.

3. Connect:

```js
const ctx = new ContextEngine({
  storage: 'postgres',
  pgConnectionString: 'postgresql://user:pass@localhost:5432/mydb',
})
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key (for openai embedding provider) |
| `DATABASE_URL` | PostgreSQL connection string (fallback for pgConnectionString) |

## Process Management

For production, run with a process manager like PM2:

```bash
# Start
pm2 start "npx context-engine serve --port 3334 --db-path /data/context.db" --name context-engine

# Monitor
pm2 logs context-engine
```

Or with systemd:

```ini
[Unit]
Description=Context Engine
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/npx context-engine serve --port 3334 --db-path /data/context.db
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

## Docker

```dockerfile
FROM node:20-slim
WORKDIR /app
RUN npm install -g context-engine-ai
EXPOSE 3334
CMD ["context-engine", "serve", "--port", "3334", "--db-path", "/data/context.db"]
```

```bash
docker build -t context-engine .
docker run -p 3334:3334 -v context-data:/data context-engine
```
