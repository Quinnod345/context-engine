<div align="center">

# context-engine-ai

**Give your AI agent a memory. Ingest events, query with natural language, get context back.**

[![npm version](https://img.shields.io/npm/v/context-engine-ai)](https://www.npmjs.com/package/context-engine-ai)
[![license](https://img.shields.io/npm/l/context-engine-ai)](./LICENSE)
[![tests](https://github.com/Quinnod345/context-engine/actions/workflows/ci.yml/badge.svg)](https://github.com/Quinnod345/context-engine/actions)
[![npm downloads](https://img.shields.io/npm/dm/context-engine-ai)](https://www.npmjs.com/package/context-engine-ai)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-%3E%3D18-green)](https://nodejs.org/)

[Try the Demo](#try-it-in-10-seconds) | [Install](#install) | [Quick Start](#quick-start) | [API Reference](#api-reference) | [Examples](./examples) | [Docs](./docs)

</div>

---

## Try It in 10 Seconds

```bash
npx context-engine-ai demo
```

That's it. No API keys, no database, no config. It runs a simulated developer workflow and shows how context-engine answers natural language questions about what's happening.

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
| **Temporal decay** | Recent events rank higher. Configurable half-life. |
| **Auto-deduplication** | Repeated events merge instead of duplicating. |
| **Auto-pruning** | Old/irrelevant events are pruned when the limit is hit. |
| **SQLite or Postgres** | In-memory for dev, SQLite for single-process, pgvector for production. |
| **Local or OpenAI embeddings** | Local TF-IDF (128-dim, free) or OpenAI `text-embedding-3-small` (1536-dim). |
| **HTTP server + CLI** | `npx context-engine-ai serve` — REST API in one command. |
| **Full TypeScript** | Types for everything. Works great with `@ts-check`. |

## Install

```bash
npm install context-engine-ai
```

## Quick Start

### As a Library

```js
import { ContextEngine } from 'context-engine-ai'

const ctx = new ContextEngine()

// Ingest events from any source
await ctx.ingest({ type: 'app_switch', data: { app: 'VS Code', file: 'index.ts' } })
await ctx.ingest({ type: 'calendar', data: { event: 'Team standup', in: '30min' } })
await ctx.ingest({ type: 'message', data: { from: 'Alice', text: 'PR ready for review' } })

// Query with natural language
const result = await ctx.query('what is the user working on?')
console.log(result.summary)   // human-readable context string
console.log(result.events)    // ranked StoredEvent[]

// Get recent events
const recent = await ctx.recent(10)

await ctx.close()
```

### Feed Context into an LLM

The killer use case — inject real-time context into your agent's system prompt:

```js
import { ContextEngine } from 'context-engine-ai'
import Anthropic from '@anthropic-ai/sdk'

const ctx = new ContextEngine({ dbPath: './agent-memory.db' })
const claude = new Anthropic()

// Your app ingests events as they happen
await ctx.ingest({ type: 'app_switch', data: { app: 'VS Code', file: 'auth.ts' } })
await ctx.ingest({ type: 'message', data: { from: 'Alice', text: 'auth bug is back' } })

// When the agent needs to respond, build context
const context = await ctx.query('what is happening right now?', 5)

const response = await claude.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1024,
  system: `You are a helpful coding assistant. Current context:\n${context.summary}`,
  messages: [{ role: 'user', content: 'What should I focus on?' }],
})
// Claude knows about the auth bug, the file open, and Alice's message
```

### As an HTTP Server

```js
const ctx = new ContextEngine({ dbPath: './context.db' })
ctx.serve(3334)
```

Or via CLI:

```bash
npx context-engine-ai serve --port 3334
npx context-engine-ai serve --storage postgres --pg-url postgresql://localhost/mydb
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
  -d '{"type": "app_switch", "data": {"app": "VS Code", "file": "main.ts"}}'

# Query
curl "http://localhost:3334/context?q=what%20am%20I%20working%20on"

# Recent
curl "http://localhost:3334/recent?limit=10"
```

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

Uses [pgvector](https://github.com/pgvector/pgvector) for native vector similarity search. Better for production, multi-process, and large-scale deployments. Requires the `vector` extension.

```js
const ctx = new ContextEngine({
  storage: 'postgres',
  pgConnectionString: 'postgresql://user:pass@localhost:5432/mydb',
})
```

### Embeddings: Local (default)

TF-IDF with locality-sensitive hashing. 128-dimensional vectors. No external calls, instant, deterministic. Good enough for most context matching use cases.

### Embeddings: OpenAI

Uses `text-embedding-3-small` (1536-dimensional). Higher quality semantic similarity for complex queries. Requires an API key.

```js
const ctx = new ContextEngine({
  embeddingProvider: 'openai',
  openaiApiKey: 'sk-...',  // or set OPENAI_API_KEY
})
```

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

See [docs/custom-adapters.md](./docs/custom-adapters.md) for building custom storage and embedding providers.

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

## Use Cases

- **AI agent memory** -- Give your agent real-time awareness of what the user is doing
- **Desktop assistants** -- Index app switches, window titles, active files for context-aware help
- **Smart notifications** -- Check what the user is doing before interrupting them
- **Meeting prep** -- Combine calendar + recent work + messages for automated briefings
- **Log analysis** -- Ingest structured logs, query them with plain English
- **IoT / sensor fusion** -- Unify events from multiple sources into one queryable context stream
- **Chat context** -- Feed conversation history + user activity into LLM system prompts

## Examples

See the [`examples/`](./examples) directory:

| Example | Description |
|---------|-------------|
| [`demo.js`](./examples/demo.js) | Interactive demo -- simulates a workflow and queries it |
| [`basic.js`](./examples/basic.js) | Event ingestion and semantic querying |
| [`server.js`](./examples/server.js) | Running as an HTTP service |
| [`agent-context.js`](./examples/agent-context.js) | Feeding context into an AI agent prompt |
| [`custom-storage.js`](./examples/custom-storage.js) | Using storage and embedding adapters directly |

```bash
npx context-engine-ai demo          # quick interactive demo
node examples/basic.js               # library usage
node examples/agent-context.js       # agent integration
```

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

## Documentation

- [Architecture Overview](./docs/architecture.md)
- [Custom Adapters](./docs/custom-adapters.md)
- [Deployment Guide](./docs/deployment.md)

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
