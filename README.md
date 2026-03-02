# context-engine-ai

A lightweight, general-purpose context engine for AI agents and applications. Ingest events, build semantic context, and query "what's happening right now?" with natural language.

Zero dependencies. Works out of the box with SQLite + local TF-IDF embeddings.

## Install

```bash
npm install context-engine-ai
```

## Quick Start

```js
import { ContextEngine } from 'context-engine-ai'

const ctx = new ContextEngine()
// Uses SQLite + local TF-IDF embeddings by default — zero config

await ctx.ingest({ type: 'app_switch', data: { app: 'VS Code', file: 'index.ts' } })
await ctx.ingest({ type: 'calendar', data: { event: 'Team standup', in: '30min' } })

const result = await ctx.query('what is the user working on?')
console.log(result.summary)
// [app_switch] app: VS Code, file: index.ts | [calendar] event: Team standup, in: 30min

const recent = await ctx.recent(20)
```

## HTTP Server

```js
ctx.serve(3334) // starts Express server
```

Or via CLI:

```bash
npx context-engine serve --port 3334
```

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/ingest` | Ingest an event `{ type, data }` |
| `GET` | `/context?q=...&limit=10` | Semantic query |
| `GET` | `/recent?limit=20` | Recent events |
| `GET` | `/health` | Health check |

## Configuration

```js
const ctx = new ContextEngine({
  storage: 'sqlite',          // 'sqlite' (default) or 'postgres'
  embeddingProvider: 'local',  // 'local' (default, TF-IDF) or 'openai'
  maxEvents: 1000,             // max stored events before pruning
  decayHours: 24,              // relevance half-life
  dbPath: 'context.db',       // SQLite path (default: in-memory)
  pgConnectionString: '...',   // for postgres storage
  openaiApiKey: '...',         // for openai embeddings
  deduplicationWindow: 60000,  // ms window for dedup (default: 60s)
  deduplicationThreshold: 0.95 // cosine similarity threshold
})
```

## Features

- **Storage adapters**: SQLite (zero config, better-sqlite3) and PostgreSQL (pgvector)
- **Embedding providers**: Local TF-IDF (no deps, instant) or OpenAI text-embedding-3-small
- **Temporal decay**: Events lose relevance over time with configurable half-life
- **Deduplication**: Similar events within a time window are automatically merged
- **Auto-pruning**: Oldest/least relevant events pruned when limit exceeded
- **REST API**: Clean Express server with ingest, query, and recent endpoints
- **CLI**: `context-engine serve` with full option flags

## API

### `ctx.ingest(event)` → `StoredEvent`
Ingest an event. Returns the stored (or merged) event.

### `ctx.query(question, limit?)` → `ContextResult`
Semantic search. Returns `{ summary, events, query, timestamp }`.

### `ctx.recent(limit?)` → `StoredEvent[]`
Most recent events by timestamp.

### `ctx.serve(port?)` → `Server`
Start HTTP server.

### `ctx.close()`
Clean shutdown (closes DB + HTTP).

## License

MIT

---

Built with ❤️ for AI agents. Contributions welcome at [GitHub](https://github.com/Quinnod345/context-engine).
