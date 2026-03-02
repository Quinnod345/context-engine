<div align="center">

# context-engine-ai

**A lightweight context engine for AI agents. Ingest events, build semantic context, query with natural language.**

[![npm version](https://img.shields.io/npm/v/context-engine-ai)](https://www.npmjs.com/package/context-engine-ai)
[![license](https://img.shields.io/npm/l/context-engine-ai)](./LICENSE)
[![tests](https://github.com/Quinnod345/context-engine/actions/workflows/ci.yml/badge.svg)](https://github.com/Quinnod345/context-engine/actions)
[![npm downloads](https://img.shields.io/npm/dm/context-engine-ai)](https://www.npmjs.com/package/context-engine-ai)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-%3E%3D18-green)](https://nodejs.org/)

[Install](#install) | [Quick Start](#quick-start) | [API Reference](#api-reference) | [Examples](./examples) | [Docs](./docs)

</div>

---

## Why?

AI agents need to know what's happening *right now*. Not search results -- **context**. What app is the user in? What did they just do? What's coming up?

Most solutions require heavy ML infrastructure or cloud APIs just to start. `context-engine-ai` gives you semantic context with zero config:

```js
import { ContextEngine } from 'context-engine-ai'

const ctx = new ContextEngine()   // SQLite + local TF-IDF -- zero config, no API keys

await ctx.ingest({ type: 'app_switch', data: { app: 'VS Code', file: 'main.ts' } })
await ctx.ingest({ type: 'calendar',   data: { event: 'Standup', in: '15min' } })
await ctx.ingest({ type: 'message',    data: { from: 'Alice', text: 'PR ready for review' } })

const result = await ctx.query('what is the user doing?')
console.log(result.summary)
// [app_switch] app: VS Code, file: main.ts | [calendar] event: Standup, in: 15min
```

## Features

- **Zero config default** -- SQLite + local TF-IDF embeddings. No API keys, no cloud, instant.
- **Semantic querying** -- Natural language queries like `"what is the user working on?"` instead of keyword search.
- **Temporal decay** -- Recent events matter more. Configurable half-life.
- **Auto-deduplication** -- Repeated events are merged, not duplicated.
- **Auto-pruning** -- Least relevant events are pruned when the limit is exceeded.
- **Storage adapters** -- SQLite (default) or PostgreSQL with pgvector.
- **Embedding providers** -- Local TF-IDF (default, 128-dim) or OpenAI `text-embedding-3-small` (1536-dim).
- **HTTP server** -- REST API with ingest, query, and recent endpoints.
- **CLI** -- `npx context-engine serve` with full option flags.
- **TypeScript** -- Full type definitions for all exports.

## Install

```bash
npm install context-engine-ai
```

## Quick Start

### As a Library

```js
import { ContextEngine } from 'context-engine-ai'

const ctx = new ContextEngine()

// Ingest events
await ctx.ingest({ type: 'app_switch', data: { app: 'VS Code', file: 'index.ts' } })
await ctx.ingest({ type: 'calendar', data: { event: 'Team standup', in: '30min' } })
await ctx.ingest({ type: 'message', data: { from: 'Alice', text: 'PR ready for review' } })

// Semantic query
const result = await ctx.query('what is the user working on?')
console.log(result.summary)   // human-readable summary
console.log(result.events)    // ranked StoredEvent[]

// Recent events by timestamp
const recent = await ctx.recent(10)

// Clean up
await ctx.close()
```

### As an HTTP Server

```js
const ctx = new ContextEngine({ dbPath: './context.db' })
ctx.serve(3334)
```

Or via CLI:

```bash
npx context-engine serve --port 3334
npx context-engine serve --storage sqlite --db-path ./context.db
npx context-engine serve --storage postgres --pg-url postgresql://localhost/mydb
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

Ingest an event. Embeds the event text, checks for duplicates, stores it, and prunes if over the limit. Returns the stored (or merged) event.

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

Semantic search across stored events. Applies temporal decay. Returns events ranked by relevance with a human-readable summary.

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

Full type definitions are included:

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
- **Desktop context** -- Index app switches, window titles, active files
- **Smart notifications** -- Check context before interrupting the user
- **Meeting prep** -- Combine calendar + recent work for automated briefings
- **Log analysis** -- Ingest structured logs, query semantically
- **IoT / sensor fusion** -- Unify events from multiple sources into one context stream
- **Chat context** -- Feed conversation history + user activity into LLM prompts

## Examples

See the [`examples/`](./examples) directory:

| Example | Description |
|---------|-------------|
| [`basic.js`](./examples/basic.js) | Event ingestion and semantic querying |
| [`server.js`](./examples/server.js) | Running as an HTTP service |
| [`agent-context.js`](./examples/agent-context.js) | Feeding context into an AI agent prompt |
| [`custom-storage.js`](./examples/custom-storage.js) | Using storage and embedding adapters directly |

```bash
node examples/basic.js
node examples/server.js
node examples/agent-context.js
node examples/custom-storage.js
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

Contributions welcome. Open an issue or PR.

## License

[MIT](./LICENSE)
