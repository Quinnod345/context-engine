<div align="center">

# context-engine-ai

**Give your AI agent a memory of what just happened.**

Ingest events from any source. Query with natural language. Get back ranked, time-decayed results — no vector database, no API keys, no config.

[![npm version](https://img.shields.io/npm/v/context-engine-ai)](https://www.npmjs.com/package/context-engine-ai)
[![CI](https://github.com/Quinnod345/context-engine/actions/workflows/ci.yml/badge.svg)](https://github.com/Quinnod345/context-engine/actions)
[![license](https://img.shields.io/npm/l/context-engine-ai)](./LICENSE)
[![npm downloads](https://img.shields.io/npm/dm/context-engine-ai)](https://www.npmjs.com/package/context-engine-ai)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-%3E%3D18-green)](https://nodejs.org/)

[Try the Demo](#try-it-in-10-seconds) · [Install](#install) · [Quick Start](#quick-start) · [Use Cases](#use-cases) · [API Reference](#api-reference) · [Examples](./examples)

</div>

---

## Try It in 10 Seconds

```bash
npx context-engine-ai demo
```

No API keys. No database. No config. Runs a simulated developer workflow and shows how context-engine answers natural language questions about what's happening.

---

## The Problem

You're building an AI agent. It needs to know what's going on — the user just switched to VS Code, a Slack message came in, there's a meeting in 15 minutes, and three tests are failing.

Your options today:

1. **Vector database + embedding API** — Set up Pinecone/Weaviate, get an OpenAI key, write the retrieval pipeline, handle rate limits. Works, but it's infrastructure for what should be a function call.
2. **Stuff everything into the prompt** — Append raw events to the system prompt. Hits token limits fast. No relevance ranking. Old events drown out new ones.
3. **Build it yourself** — Roll your own event store, embedding logic, similarity search, temporal decay, deduplication. Easily a week of work before you write any agent logic.

`context-engine-ai` is option 4: a single import that handles all of this.

```js
import { ContextEngine } from 'context-engine-ai'

const ctx = new ContextEngine()   // SQLite + local embeddings, zero config

await ctx.ingest({ type: 'app_switch', data: { app: 'VS Code', file: 'main.ts' } })
await ctx.ingest({ type: 'calendar',   data: { event: 'Standup', in: '15min' } })
await ctx.ingest({ type: 'message',    data: { from: 'Alice', text: 'PR ready for review' } })

const result = await ctx.query('what is the user doing right now?')
```

**Returns:**

```js
{
  summary: '[app_switch] app: VS Code, file: main.ts | [calendar] event: Standup, in: 15min | [message] from: Alice, text: PR ready for review',
  events: [
    { type: 'app_switch', data: { app: 'VS Code', file: 'main.ts' }, relevance: 0.94, ... },
    { type: 'calendar',   data: { event: 'Standup', in: '15min' },   relevance: 0.87, ... },
    { type: 'message',    data: { from: 'Alice', text: 'PR ready for review' }, relevance: 0.82, ... },
  ],
  query: 'what is the user doing right now?',
  timestamp: 1709312400000
}
```

Events are ranked by **similarity** to your query and weighted by **recency** — a 5-minute-old event scores higher than an identical one from yesterday. Local TF-IDF handles keyword matching out of the box; upgrade to OpenAI embeddings for true semantic search. The `summary` string is formatted for direct injection into LLM system prompts — drop it into your agent's context and it just works.

---

## Features

| Feature | Description |
|---------|-------------|
| **Zero config** | SQLite + local TF-IDF embeddings. No API keys, no cloud, instant startup. |
| **Natural language querying** | Ask `"test results?"` instead of writing SQL or filtering by type. Local TF-IDF for keyword matching; upgrade to OpenAI embeddings for true semantic search. |
| **Temporal decay** | Recent events automatically rank higher. Configurable half-life (default: 24h). |
| **Auto-deduplication** | Switching between two apps 50 times doesn't create 50 events — duplicates merge within a configurable time window. |
| **Auto-pruning** | When event count exceeds your limit, the lowest-relevance oldest events are removed. No cron jobs. |
| **SQLite or PostgreSQL** | In-memory for dev, SQLite file for persistence, pgvector for production scale. |
| **Local or OpenAI embeddings** | Local TF-IDF (128-dim, free, no network) or OpenAI `text-embedding-3-small` (1536-dim) for higher semantic quality. |
| **HTTP server + CLI** | `npx context-engine-ai serve` — REST API in one command. |
| **Full TypeScript** | Types for every interface. Works great with `@ts-check` in JS files too. |
| **~64KB unpacked** | Tiny footprint. Ships only what's needed. |

---

## When to Use This

**Good fit:**
- Your AI agent needs real-time awareness of what's happening (user activity, system events, messages)
- You want semantic search over a stream of structured events
- You need something working in minutes, not days
- You're building a prototype and don't want to set up infrastructure
- You want temporal decay and deduplication handled for you

**Not the right tool:**
- You need to search over large documents or PDFs (use a RAG framework like LangChain or LlamaIndex)
- You need persistent long-term memory across months of history (use a proper vector database)
- You're indexing millions of documents (use pgvector or a dedicated vector DB directly)

---

## How It Compares

| | context-engine-ai | RAG frameworks | Custom implementation |
|---|---|---|---|
| **Setup** | `npm install`, done | Vector DB + embedding API + retrieval chain | Days of plumbing |
| **API keys** | No (local TF-IDF default) | Yes (OpenAI/Cohere/etc) | Depends |
| **Temporal decay** | Built-in, configurable | Manual implementation | Build it yourself |
| **Deduplication** | Built-in (cosine threshold + time window) | Manual | Build it yourself |
| **Data model** | Event-oriented `{type, data}` | Document chunks | Your schema |
| **Query interface** | Natural language | Natural language | SQL / custom |
| **Storage** | SQLite (zero-config) → PostgreSQL | Pinecone/Weaviate/Chroma | Your choice |
| **HTTP server** | `ctx.serve(3334)` — one line | Build it | Build it |
| **Size** | ~64KB | 10-100MB+ with dependencies | Varies |

---

## Install

```bash
npm install context-engine-ai
```

---

## Quick Start

### As a Library

```js
import { ContextEngine } from 'context-engine-ai'

const ctx = new ContextEngine()

await ctx.ingest({ type: 'task', data: { title: 'Review PR #42', priority: 'high' } })
await ctx.ingest({ type: 'message', data: { from: 'Alice', text: 'deploy is broken' } })

const result = await ctx.query('any issues right now?')
console.log(result.summary)
// => "[message] from: Alice, text: deploy is broken | [task] title: Review PR #42, priority: high"
console.log(result.events)
// => StoredEvent[] sorted by relevance × recency

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
# Ingest an event
curl -X POST http://localhost:3334/ingest \
  -H 'Content-Type: application/json' \
  -d '{"type": "deploy", "data": {"service": "api", "version": "2.1.0", "env": "production"}}'

# Query with natural language
curl "http://localhost:3334/context?q=recent%20deployments&limit=5"

# Get recent events
curl "http://localhost:3334/recent?limit=10"
```

---

## Use Cases

### 1. Give your AI agent situational awareness

The core use case. Ingest events as they happen — user actions, system alerts, messages, calendar entries — and query for relevant context when the agent responds.

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

// Agent gets relevant context for its response
const context = await ctx.query('what needs attention?', 5)

const response = await claude.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1024,
  system: `You are a developer assistant. Current context:\n${context.summary}`,
  messages: [{ role: 'user', content: 'What should I focus on?' }]
})
// Claude sees the auth errors, failing tests, and related PR — responds with specific advice
```

### 2. Desktop activity tracker

Track what you're doing across apps. Deduplication means switching between two windows 100 times creates 2 events, not 100.

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

// Later: "what was I doing this afternoon?"
const result = await ctx.query('what was I working on?')
console.log(result.summary)
// => "[window_focus] app: VS Code | [window_focus] app: Firefox | [window_focus] app: Slack"
```

### 3. Webhook aggregation

Receive events from GitHub, Slack, PagerDuty, or any webhook source. Query the combined stream in natural language instead of checking each service individually.

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

app.post('/webhook/pagerduty', async (req, res) => {
  const { event } = req.body
  await ctx.ingest({
    type: 'alert',
    data: { severity: event?.severity, summary: event?.summary?.slice(0, 200) }
  })
  res.sendStatus(200)
})

// One query across all sources
app.get('/context', async (req, res) => {
  const result = await ctx.query(req.query.q, parseInt(req.query.limit) || 10)
  res.json(result)
})

app.listen(4000)
```

### 4. Other ideas

- **Smart notifications** — Check what the user is doing before interrupting them
- **Meeting prep** — Combine calendar + recent work + messages for automated briefings
- **Log analysis** — Ingest structured logs, query them with plain English
- **IoT / sensor fusion** — Unify events from multiple devices into one queryable stream
- **Chat context** — Feed conversation history + user activity into LLM system prompts

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

1. **Ingest** — Events arrive as `{type, data}`. The engine converts them to text (`"event:message from:Alice text:PR ready"`), generates an embedding (local TF-IDF or OpenAI), checks for near-duplicates within a configurable time window, and stores them.

2. **Query** — Your natural language question is embedded and compared against stored events using cosine similarity. Results are weighted by temporal decay — recent events score higher, controlled by a configurable half-life (default 24 hours).

3. **Prune** — When event count exceeds `maxEvents`, the lowest-relevance oldest events are automatically removed. No maintenance required.

The local embedding provider uses TF-IDF with locality-sensitive hashing projected into 128 dimensions. No network calls, deterministic, fast. Swap to OpenAI embeddings with one config change when you need higher semantic quality.

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
  openaiApiKey: '...',             // Required for OpenAI (or set OPENAI_API_KEY env var)

  // Tuning
  maxEvents: 1000,                 // Max stored events before pruning (default: 1000)
  decayHours: 24,                  // Relevance half-life in hours (default: 24)
  deduplicationWindow: 60000,      // Dedup time window in ms (default: 60s)
  deduplicationThreshold: 0.95,    // Cosine similarity threshold for dedup (default: 0.95)
})
```

### Storage: SQLite (default)

Zero config. Uses [better-sqlite3](https://github.com/WiseLibs/better-sqlite3). Stores embeddings as JSON arrays. Good for single-process use, prototyping, and edge deployments.

Pass `dbPath` to persist across restarts. Without it, uses in-memory storage (events lost on restart).

### Storage: PostgreSQL + pgvector

Uses [pgvector](https://github.com/pgvector/pgvector) for native vector similarity search. Multi-process safe, production-ready, handles millions of events. Requires the `vector` extension to be installed.

```js
const ctx = new ContextEngine({
  storage: 'postgres',
  pgConnectionString: 'postgresql://user:pass@localhost:5432/mydb',
})
```

### Embeddings: Local (default)

TF-IDF with locality-sensitive hashing. 128-dimensional vectors. No external calls, instant, deterministic. Performs well for matching structured event data to natural language queries.

### Embeddings: OpenAI

Uses `text-embedding-3-small` (1536-dimensional). Higher semantic quality for complex or ambiguous queries. Requires an API key.

```js
const ctx = new ContextEngine({
  embeddingProvider: 'openai',
  openaiApiKey: 'sk-...',  // or set OPENAI_API_KEY env var
})
```

---

## API Reference

### `new ContextEngine(options?)`

Create a new engine instance. See [Configuration](#configuration) for all options.

### `ctx.ingest(event): Promise<StoredEvent>`

Ingest an event. Embeds the event text, checks for duplicates, stores it, and prunes if over the limit. If a near-duplicate exists within the deduplication window, the existing event is updated instead of creating a new one.

```ts
interface EventInput {
  type: string                     // Event category (e.g. 'app_switch', 'message', 'error')
  data: Record<string, unknown>    // Event payload — any key/value pairs
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

Semantic search across stored events. Returns events ranked by cosine similarity to the query, weighted by temporal decay. Includes a pre-formatted `summary` string suitable for injecting into LLM prompts.

```ts
interface ContextResult {
  summary: string          // Human-readable: "[type] key: val | [type] key: val"
  events: StoredEvent[]    // Ranked by relevance × decay
  query: string            // The original query
  timestamp: number        // When the query was executed
}
```

### `ctx.recent(limit?): Promise<StoredEvent[]>`

Get the most recent events ordered by timestamp. Default limit: 20.

### `ctx.serve(port?): Server`

Start an Express HTTP server. Default port: 3334. Returns a Node.js `http.Server`.

### `ctx.close(): Promise<void>`

Clean shutdown. Closes database connections and HTTP server.

### Utility Exports

For advanced use — build custom storage backends or embedding providers:

```js
import {
  SQLiteStorage,           // StorageAdapter implementation for SQLite
  PostgresStorage,         // StorageAdapter implementation for PostgreSQL + pgvector
  LocalEmbeddingProvider,  // TF-IDF embeddings (128-dim, no network)
  OpenAIEmbeddingProvider, // OpenAI text-embedding-3-small (1536-dim)
  createServer,            // Express app factory
  cosineSimilarity,        // (a: number[], b: number[]) => number
  computeDecay,            // (timestamp, now, halfLifeHours) => number
  eventToText,             // (type, data) => string
} from 'context-engine-ai'
```

### TypeScript

Full type definitions included:

```ts
import type {
  StoredEvent,
  EventInput,
  ContextResult,
  StorageAdapter,       // Implement this to add custom storage backends
  EmbeddingProvider,    // Implement this to add custom embedding providers
  EngineOptions,
} from 'context-engine-ai'
```

---

## Examples

See the [`examples/`](./examples) directory for runnable code:

| Example | Description |
|---------|-------------|
| [`basic.js`](./examples/basic.js) | Event ingestion and semantic querying |
| [`server.js`](./examples/server.js) | Running as an HTTP service |
| [`ai-agent.js`](./examples/ai-agent.js) | Feeding context into Claude |
| [`webhook-server.js`](./examples/webhook-server.js) | Multi-source webhook aggregation |
| [`custom-storage.js`](./examples/custom-storage.js) | Implementing a custom storage adapter |

```bash
npx context-engine-ai demo          # Interactive demo — no setup needed
node examples/basic.js               # Library usage
node examples/ai-agent.js            # Agent integration (needs ANTHROPIC_API_KEY)
```

---

## Documentation

- [Architecture Overview](./docs/architecture.md)
- [Custom Adapters](./docs/custom-adapters.md)
- [Deployment Guide](./docs/deployment.md)

## Requirements

- Node.js >= 18
- No external services required (default configuration)
- Optional: PostgreSQL with pgvector extension (for production scale)
- Optional: OpenAI API key (for higher-quality embeddings)

---

## Development

```bash
git clone https://github.com/Quinnod345/context-engine.git
cd context-engine
npm install
npm run build     # Compile TypeScript
npm test          # Run test suite
npm run dev       # Watch mode
```

## Contributing

Contributions welcome. Open an issue or PR. Some ideas:

- New storage adapters (Redis, DuckDB, Turso)
- New embedding providers (Cohere, local ONNX models)
- Browser extension for automatic context capture
- MCP (Model Context Protocol) server integration
- Streaming ingestion via WebSocket

## License

[MIT](./LICENSE)
