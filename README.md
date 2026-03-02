<div align="center">

# context-engine-ai

**Give your AI agent a memory. Ingest events, query with natural language, get context back.**

[![npm version](https://img.shields.io/npm/v/context-engine-ai)](https://www.npmjs.com/package/context-engine-ai)
[![CI](https://github.com/Quinnod345/context-engine/actions/workflows/ci.yml/badge.svg)](https://github.com/Quinnod345/context-engine/actions)
[![license](https://img.shields.io/npm/l/context-engine-ai)](./LICENSE)
[![npm downloads](https://img.shields.io/npm/dm/context-engine-ai)](https://www.npmjs.com/package/context-engine-ai)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-%3E%3D18-green)](https://nodejs.org/)

[Try the Demo](#try-it-in-10-seconds) | [Install](#install) | [Use Cases](#use-cases) | [Quick Start](#quick-start) | [API Reference](#api-reference) | [Examples](./examples)

</div>

---

## Try It in 10 Seconds

```bash
npx context-engine-ai demo
```

No API keys, no database, no config. Runs a simulated developer workflow and shows how context-engine answers natural language questions about what's happening.

## Why?

Every AI agent needs to answer one question: **"What's happening right now?"**

Not "search my vector database." Not "look up this embedding." Just: what did the user just do? What's coming up? Who messaged them?

Most solutions require OpenAI keys, Pinecone accounts, or a Postgres cluster just to start. `context-engine-ai` gives you semantic context in 3 lines:

```js
import { ContextEngine } from 'context-engine-ai'

const ctx = new ContextEngine()   // SQLite + local embeddings — zero config

await ctx.ingest({ type: 'app_switch', data: { app: 'VS Code', file: 'main.ts' } })
await ctx.ingest({ type: 'calendar',   data: { event: 'Standup', in: '15min' } })
await ctx.ingest({ type: 'message',    data: { from: 'Alice', text: 'PR ready for review' } })

const result = await ctx.query('what is the user doing?')
// => [app_switch] app: VS Code, file: main.ts | [calendar] event: Standup, in: 15min
```

## Features

| Feature | Description |
|---------|-------------|
| **Zero config** | SQLite + local TF-IDF embeddings. No API keys, no cloud, instant startup. |
| **Semantic querying** | Ask `"what is the user working on?"` instead of writing SQL. |
| **Temporal decay** | Recent events rank higher. Configurable half-life (default: 24h). |
| **Auto-deduplication** | Repeated events merge instead of flooding your context. |
| **Auto-pruning** | Old/irrelevant events are removed when the limit is hit. |
| **SQLite or Postgres** | In-memory for dev, SQLite file for persistence, pgvector for production. |
| **Local or OpenAI embeddings** | Local TF-IDF (128-dim, free) or OpenAI `text-embedding-3-small` (1536-dim). |
| **HTTP server + CLI** | `npx context-engine-ai serve` — REST API in one command. |
| **Full TypeScript** | Types for everything. Works great with `@ts-check`. |
| **~64KB** | Tiny footprint. No bloat. |

### How It Compares

| | context-engine-ai | RAG frameworks | Custom implementation |
|---|---|---|---|
| Setup | `npm install`, done | Vector DB + embedding API + retrieval chain | Days of plumbing |
| API keys required | No (local TF-IDF) | Yes (OpenAI/Cohere/etc) | Depends |
| Temporal decay | Built-in | Manual | Build it yourself |
| Deduplication | Built-in (cosine threshold) | Manual | Build it yourself |
| Data model | Event-oriented `{type, data}` | Document-oriented | Your schema |
| Storage | SQLite (zero-config) or PostgreSQL | Pinecone/Weaviate/Chroma | Your choice |
| HTTP server | One line: `ctx.serve(3334)` | Build it | Build it |

## Install

```bash
npm install context-engine-ai
```

---

## Use Cases

### Give your AI agent situational awareness

The most common use case. Your application ingests events as they happen — user actions, system alerts, messages, calendar entries — and when the agent needs to respond, it queries for relevant context to include in its prompt.

```js
import Anthropic from '@anthropic-ai/sdk'
import { ContextEngine } from 'context-engine-ai'

const ctx = new ContextEngine({ dbPath: './agent-context.db' })
const claude = new Anthropic()

// Events stream in throughout the day
await ctx.ingest({ type: 'terminal', data: { command: 'npm test', output: '3 failed, 12 passed' } })
await ctx.ingest({ type: 'slack',   data: { from: 'Sarah', text: 'Auth service throwing 401s in staging' } })
await ctx.ingest({ type: 'error',   data: { service: 'auth', error: 'TokenExpiredError', count: 47 } })
await ctx.ingest({ type: 'pr',      data: { repo: 'backend', title: 'Fix OAuth token refresh', status: 'review_requested' } })

// When the agent responds, it knows what's going on
const context = await ctx.query('what needs attention?', 5)

const response = await claude.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1024,
  system: `You are a developer assistant. Current context:\n${context.summary}`,
  messages: [{ role: 'user', content: 'What should I focus on?' }]
})
// Claude sees the auth errors, failing tests, and related PR — responds accordingly
```

### Build a personal activity tracker

Track what you're working on across apps and query it later. The engine handles deduplication automatically — switching back and forth between two apps doesn't flood your context.

```js
import { ContextEngine } from 'context-engine-ai'
import { execSync } from 'child_process'

const ctx = new ContextEngine({ dbPath: './desktop.db', decayHours: 8 })

// Poll active window every 5 seconds
setInterval(async () => {
  const app = execSync(
    `osascript -e 'tell app "System Events" to get name of first process whose frontmost is true'`,
    { encoding: 'utf-8' }
  ).trim()
  await ctx.ingest({ type: 'window_focus', data: { app } })
}, 5000)

// End of day: "what was I doing this afternoon?"
const result = await ctx.query('what was I working on?')
console.log(result.summary)
```

### Aggregate webhooks into queryable context

Receive events from GitHub, Slack, PagerDuty, or any service with webhooks. Query the combined stream in natural language instead of checking each service individually.

```js
import express from 'express'
import { ContextEngine } from 'context-engine-ai'

const ctx = new ContextEngine({ dbPath: './ops.db', maxEvents: 5000, decayHours: 48 })
const app = express()
app.use(express.json())

app.post('/webhook/github', async (req, res) => {
  const { action, pull_request, repository } = req.body
  await ctx.ingest({
    type: 'github_pr',
    data: { action, title: pull_request?.title, repo: repository?.full_name }
  })
  res.sendStatus(200)
})

app.post('/webhook/slack', async (req, res) => {
  const { event } = req.body
  if (event?.type === 'message') {
    await ctx.ingest({
      type: 'slack_message',
      data: { channel: event.channel, user: event.user, text: event.text?.slice(0, 200) }
    })
  }
  res.sendStatus(200)
})

// One query across all sources
app.get('/context', async (req, res) => {
  const result = await ctx.query(req.query.q, parseInt(req.query.limit) || 10)
  res.json(result)
})

app.listen(4000)
```

### More ideas

- **Smart notifications** — Check what the user is doing before interrupting them
- **Meeting prep** — Combine calendar + recent work + messages for automated briefings
- **Log analysis** — Ingest structured logs, query them with plain English
- **IoT / sensor fusion** — Unify events from multiple sources into one queryable stream
- **Chat context** — Feed conversation history + user activity into LLM system prompts

---

## Quick Start

### As a Library

```js
import { ContextEngine } from 'context-engine-ai'

const ctx = new ContextEngine()

await ctx.ingest({ type: 'task', data: { title: 'Review PR #42', priority: 'high' } })
await ctx.ingest({ type: 'message', data: { from: 'Alice', text: 'deploy is broken' } })

const result = await ctx.query('any issues right now?')
console.log(result.summary)   // "[message] from: Alice, text: deploy is broken | ..."
console.log(result.events)    // StoredEvent[] sorted by relevance

await ctx.close()
```

### With Persistence

```js
const ctx = new ContextEngine({ dbPath: './my-context.db' })
// Events survive restarts. Standard SQLite file — inspect with any SQLite tool.
```

### Production (PostgreSQL + pgvector)

```js
const ctx = new ContextEngine({
  storage: 'postgres',
  pgConnectionString: 'postgresql://user:pass@localhost:5432/mydb',
  embeddingProvider: 'openai',
  openaiApiKey: process.env.OPENAI_API_KEY,
})
```

### As an HTTP Server

```js
const ctx = new ContextEngine({ dbPath: './context.db' })
ctx.serve(3334)
```

Or via CLI:

```bash
npx context-engine-ai serve --port 3334
```

### REST Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/ingest` | Ingest an event `{ type, data }` |
| `GET`  | `/context?q=...&limit=10` | Semantic query |
| `GET`  | `/recent?limit=20` | Recent events by timestamp |
| `GET`  | `/health` | Health check |

```bash
# Ingest
curl -X POST http://localhost:3334/ingest \
  -H 'Content-Type: application/json' \
  -d '{"type": "deploy", "data": {"service": "api", "version": "2.1.0", "env": "production"}}'

# Query
curl "http://localhost:3334/context?q=recent%20deployments&limit=5"

# Recent
curl "http://localhost:3334/recent?limit=10"
```

---

## How It Works

```
Events In          Embed           Store             Query
─────────────┐    ┌──────┐    ┌────────────┐    ┌──────────────┐
app_switch   │───>│TF-IDF│───>│  SQLite /   │<───│ "what is the │
calendar     │    │  or   │    │  pgvector   │    │  user doing?"│
message      │    │OpenAI │    │             │    └──────┬───────┘
terminal     │    └──────┘    └────────────┘           │
git_commit   │                  dedup + prune     cosine similarity
─────────────┘                                    + temporal decay
                                                       │
                                                  ┌────▼────┐
                                                  │ Ranked  │
                                                  │ Context │
                                                  └─────────┘
```

1. **Ingest** — Events arrive as `{type, data}`. The engine converts them to text, generates an embedding (local TF-IDF or OpenAI), checks for near-duplicates within a configurable time window, and stores them with a relevance score.

2. **Query** — Your natural language question is embedded and compared against stored events using cosine similarity. Results are weighted by temporal decay — recent events score higher than old ones, controlled by a configurable half-life.

3. **Prune** — When event count exceeds `maxEvents`, the lowest-relevance oldest events are automatically removed. No maintenance required.

The local embedding provider uses TF-IDF with locality-sensitive hashing projected into 128 dimensions. No network calls, deterministic, fast. When you need higher semantic quality, swap to OpenAI embeddings with one config change.

---

## Configuration

```js
const ctx = new ContextEngine({
  // Storage
  storage: 'sqlite',              // 'sqlite' (default) or 'postgres'
  dbPath: './context.db',          // SQLite file path (default: in-memory)
  pgConnectionString: '...',       // PostgreSQL connection string

  // Embeddings
  embeddingProvider: 'local',      // 'local' (TF-IDF, default) or 'openai'
  openaiApiKey: '...',             // for OpenAI (or set OPENAI_API_KEY env var)

  // Tuning
  maxEvents: 1000,                 // max stored events before pruning (default: 1000)
  decayHours: 24,                  // relevance half-life in hours (default: 24)
  deduplicationWindow: 60000,      // dedup time window in ms (default: 60s)
  deduplicationThreshold: 0.95,    // cosine similarity threshold (default: 0.95)
})
```

### Storage: SQLite (default)

Zero config. Uses [better-sqlite3](https://github.com/WiseLibs/better-sqlite3). Stores embeddings as JSON. Good for single-process use, prototyping, and edge deployments.

Pass `dbPath` to persist across restarts. Without it, uses in-memory storage.

### Storage: PostgreSQL

Uses [pgvector](https://github.com/pgvector/pgvector) for native vector similarity search. Multi-process safe, production-ready, handles millions of events. Requires the `vector` extension.

```js
const ctx = new ContextEngine({
  storage: 'postgres',
  pgConnectionString: 'postgresql://user:pass@localhost:5432/mydb',
})
```

### Embeddings: Local (default)

TF-IDF with locality-sensitive hashing. 128-dimensional vectors. No external calls, instant, deterministic. Good enough for most context-matching use cases.

### Embeddings: OpenAI

Uses `text-embedding-3-small` (1536-dimensional). Higher semantic quality for complex queries. Requires an API key.

```js
const ctx = new ContextEngine({
  embeddingProvider: 'openai',
  openaiApiKey: 'sk-...',  // or set OPENAI_API_KEY env var
})
```

---

## API Reference

### `new ContextEngine(options?)`

Create a new engine. See [Configuration](#configuration) for all options.

### `ctx.ingest(event): Promise<StoredEvent>`

Ingest an event. Embeds the event text, checks for duplicates, stores it, and prunes if over the limit.

```ts
interface EventInput {
  type: string                     // event category (e.g. 'app_switch', 'message')
  data: Record<string, unknown>    // event payload
}

interface StoredEvent {
  id: string
  type: string
  data: Record<string, unknown>
  timestamp: number
  embedding: number[]
  relevance: number                // 0.0 - 1.0
}
```

### `ctx.query(question, limit?): Promise<ContextResult>`

Semantic search across stored events. Applies temporal decay. Returns ranked events with a human-readable summary.

```ts
interface ContextResult {
  summary: string          // human-readable summary of top events
  events: StoredEvent[]    // ranked by relevance (with decay applied)
  query: string            // the original query
  timestamp: number
}
```

### `ctx.recent(limit?): Promise<StoredEvent[]>`

Get the most recent events ordered by timestamp. Default limit: 20.

### `ctx.serve(port?): Server`

Start an Express HTTP server. Default port: 3334. Returns a Node.js `http.Server`.

### `ctx.close(): Promise<void>`

Clean shutdown. Closes database connections and HTTP server.

### Utility Exports

```js
import {
  SQLiteStorage,
  PostgresStorage,
  LocalEmbeddingProvider,
  OpenAIEmbeddingProvider,
  createServer,
  cosineSimilarity,
  computeDecay,
  eventToText,
} from 'context-engine-ai'
```

## TypeScript

Full type definitions included:

```ts
import type {
  StoredEvent,
  EventInput,
  ContextResult,
  StorageAdapter,
  EmbeddingProvider,
  EngineOptions,
} from 'context-engine-ai'
```

---

## Examples

See the [`examples/`](./examples) directory:

| Example | Description |
|---------|-------------|
| [`basic.js`](./examples/basic.js) | Event ingestion and semantic querying |
| [`server.js`](./examples/server.js) | Running as an HTTP service |
| [`ai-agent.js`](./examples/ai-agent.js) | Feeding context into Claude |
| [`webhook-server.js`](./examples/webhook-server.js) | Multi-source webhook ingestion |

```bash
npx context-engine-ai demo          # quick interactive demo
node examples/basic.js               # library usage
node examples/ai-agent.js            # agent integration
```

## Development

```bash
git clone https://github.com/Quinnod345/context-engine.git
cd context-engine
npm install
npm run build     # compile TypeScript
npm test          # run tests
npm run dev       # watch mode
```

## Contributing

Contributions welcome. Open an issue or PR. Some ideas:

- New storage adapters (Redis, DuckDB, Turso)
- New embedding providers (Cohere, local ONNX models)
- Streaming ingestion / webhooks
- Browser extension for automatic context capture
- MCP (Model Context Protocol) server integration

## License

[MIT](./LICENSE)
