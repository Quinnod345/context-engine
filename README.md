# context-engine-ai

[![npm version](https://img.shields.io/npm/v/context-engine-ai)](https://www.npmjs.com/package/context-engine-ai)
[![license](https://img.shields.io/npm/l/context-engine-ai)](./LICENSE)
[![tests](https://img.shields.io/badge/tests-14%2F14-green)](./tests)

A lightweight, general-purpose context engine for AI agents and applications. Ingest events from any source, build semantic context, and query "what's happening right now?" with natural language.

**Zero config default.** Works out of the box with SQLite + local TF-IDF embeddings. No API keys needed.

## Why?

AI agents and personalized applications need to understand context: What's the user doing? What happened recently? What's coming up? Most solutions require heavy ML infrastructure or cloud APIs just to get started.

`context-engine-ai` gives you:

- **Ingest** events from any source (app activity, calendar, messages, logs, sensors, etc.)
- **Query** contextually ("what is the user working on?") instead of keyword searching
- **Temporal decay** so recent events matter more than old ones
- **Deduplication** so repeated events don't flood your context
- **Zero dependencies for basic use** -- SQLite + local TF-IDF, no API keys
- **Scale up** with PostgreSQL (pgvector) and OpenAI embeddings when ready

## Install

```bash
npm install context-engine-ai
```

## Quick Start

```js
import { ContextEngine } from 'context-engine-ai'

const ctx = new ContextEngine()
// Uses in-memory SQLite + local TF-IDF embeddings by default

// Ingest events from any source
await ctx.ingest({ type: 'app_switch', data: { app: 'VS Code', file: 'index.ts' } })
await ctx.ingest({ type: 'calendar', data: { event: 'Team standup', in: '30min' } })
await ctx.ingest({ type: 'message', data: { from: 'Alice', text: 'PR ready for review' } })

// Query with natural language
const result = await ctx.query('what is the user working on?')
console.log(result.summary)
// => [app_switch] app: VS Code, file: index.ts | [calendar] event: Team standup, in: 30min

// Get recent events
const recent = await ctx.recent(10)

// Clean up
await ctx.close()
```

## Persistent Storage

By default the engine uses in-memory SQLite. Pass a `dbPath` to persist:

```js
const ctx = new ContextEngine({
  dbPath: './my-context.db'
})
```

Events survive restarts. The `.db` file is a standard SQLite database.

## HTTP Server

Run the engine as an HTTP service for multi-process or cross-language access:

```js
const ctx = new ContextEngine({ dbPath: './context.db' })
ctx.serve(3334)
```

Or via CLI:

```bash
npx context-engine-ai serve --port 3334
npx context-engine-ai serve --port 3334 --db-path ./context.db
```

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/ingest` | Ingest an event `{ type, data }` |
| `GET` | `/context?q=...&limit=10` | Semantic query |
| `GET` | `/recent?limit=20` | Recent events |
| `GET` | `/health` | Health check |

### Example Requests

```bash
# Ingest an event
curl -X POST http://localhost:3334/ingest \
  -H 'Content-Type: application/json' \
  -d '{"type": "app_switch", "data": {"app": "VS Code", "file": "main.ts"}}'

# Query context
curl "http://localhost:3334/context?q=what%20am%20I%20working%20on"

# Get recent events
curl "http://localhost:3334/recent?limit=10"
```

## Configuration

```js
const ctx = new ContextEngine({
  // Storage
  storage: 'sqlite',              // 'sqlite' (default) or 'postgres'
  dbPath: './context.db',          // SQLite path (default: in-memory)
  pgConnectionString: '...',       // for PostgreSQL + pgvector

  // Embeddings
  embeddingProvider: 'local',      // 'local' (TF-IDF, default) or 'openai'
  openaiApiKey: '...',             // for OpenAI embeddings (or set OPENAI_API_KEY)

  // Tuning
  maxEvents: 1000,                 // max stored events before pruning (default: 1000)
  decayHours: 24,                  // relevance half-life in hours (default: 24)
  deduplicationWindow: 60000,      // ms window for dedup (default: 60s)
  deduplicationThreshold: 0.95,    // cosine similarity threshold (default: 0.95)
})
```

### Storage Adapters

**SQLite** (default) -- Zero config. Uses [better-sqlite3](https://github.com/WiseLibs/better-sqlite3). Stores embeddings as JSON. Good for single-process use and prototyping.

**PostgreSQL** -- Uses [pgvector](https://github.com/pgvector/pgvector) for native vector similarity search. Better for production, multi-process, and large-scale use. Requires the `vector` extension.

```js
const ctx = new ContextEngine({
  storage: 'postgres',
  pgConnectionString: 'postgresql://user:pass@localhost:5432/mydb',
})
```

### Embedding Providers

**Local** (default) -- TF-IDF with locality-sensitive hashing. 128-dimensional. No external calls, instant, deterministic. Good enough for most use cases.

**OpenAI** -- Uses `text-embedding-3-small` (1536-dimensional). Higher quality semantic similarity. Requires an API key.

```js
const ctx = new ContextEngine({
  embeddingProvider: 'openai',
  openaiApiKey: 'sk-...',
})
```

## API Reference

### `new ContextEngine(options?)`

Create a new engine instance. See [Configuration](#configuration) for options.

### `ctx.ingest(event)` -> `Promise<StoredEvent>`

Ingest an event. Automatically embeds, deduplicates, and stores it.

```js
const stored = await ctx.ingest({
  type: 'app_switch',          // string -- event category
  data: { app: 'Firefox' }     // Record<string, unknown> -- event payload
})
// stored.id, stored.timestamp, stored.relevance, etc.
```

### `ctx.query(question, limit?)` -> `Promise<ContextResult>`

Semantic search across stored events. Returns the most relevant events with a text summary.

```js
const result = await ctx.query('what is the user doing?', 5)
// result.summary   -- human-readable summary of top events
// result.events    -- array of StoredEvent sorted by relevance
// result.query     -- the original query
// result.timestamp
```

### `ctx.recent(limit?)` -> `Promise<StoredEvent[]>`

Get most recent events by timestamp.

```js
const events = await ctx.recent(20)
```

### `ctx.serve(port?)` -> `Server`

Start an Express HTTP server. Returns the Node.js `http.Server` instance.

```js
const server = ctx.serve(3334)
```

### `ctx.close()` -> `Promise<void>`

Clean shutdown -- closes database connections and HTTP server.

## Use Cases

- **AI agent context** -- Feed your agent a summary of what the user is doing right now
- **Desktop activity tracking** -- Index app switches, window titles, active files
- **Smart notifications** -- Query context before interrupting the user
- **Meeting prep** -- Ingest calendar + recent work to generate briefings
- **Log analysis** -- Ingest structured logs and query semantically
- **IoT/sensor fusion** -- Combine events from multiple sources into unified context

## Advanced: Custom Adapters

You can use the storage and embedding interfaces directly:

```js
import { SQLiteStorage, LocalEmbeddingProvider, cosineSimilarity } from 'context-engine-ai'

const storage = new SQLiteStorage('./custom.db')
await storage.init()

const embedder = new LocalEmbeddingProvider()
const vec = await embedder.embed('some text')
```

## Examples

See the [`examples/`](./examples) directory:

- **basic.js** -- Event ingestion and semantic querying
- **server.js** -- Running as an HTTP service

```bash
node examples/basic.js
node examples/server.js
```

## TypeScript

Full TypeScript support with exported types:

```ts
import type {
  StoredEvent,
  EventInput,
  ContextResult,
  StorageAdapter,
  EmbeddingProvider,
  EngineOptions
} from 'context-engine-ai'
```

## Requirements

- Node.js >= 18
- For PostgreSQL: `pgvector` extension installed
- For OpenAI embeddings: valid API key

## License

MIT
