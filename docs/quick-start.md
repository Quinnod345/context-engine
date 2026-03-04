# Quick Start Guide

Get context-engine-ai running in under 2 minutes.

## Install

```bash
npm install context-engine-ai
```

## 1. Basic Usage (5 lines)

```js
import { ContextEngine } from 'context-engine-ai'

const ctx = new ContextEngine()

await ctx.ingest({ type: 'message', data: { from: 'Alice', text: 'deploy is broken' } })
await ctx.ingest({ type: 'task', data: { title: 'Review PR #42', priority: 'high' } })

const result = await ctx.query('any issues?')
console.log(result.summary)
// => "[message] from: Alice, text: deploy is broken | [task] title: Review PR #42, priority: high"

await ctx.close()
```

## 2. Persist Across Restarts

Pass a file path to keep events on disk:

```js
const ctx = new ContextEngine({ dbPath: './my-context.db' })
```

Standard SQLite file — inspect with any SQLite tool.

## 3. Feed Context into an LLM

The `summary` field is formatted for direct use in system prompts:

```js
const context = await ctx.query('what needs attention?', 5)

// Pass to any LLM
const systemPrompt = `You are a developer assistant. Current context:\n${context.summary}`
```

## 4. Run as HTTP Server

One line:

```js
ctx.serve(3334)
```

Or via CLI:

```bash
npx context-engine-ai serve --port 3334
```

Then use the REST API:

```bash
# Ingest
curl -X POST http://localhost:3334/ingest \
  -H 'Content-Type: application/json' \
  -d '{"type": "deploy", "data": {"service": "api", "version": "2.1.0"}}'

# Query
curl "http://localhost:3334/context?q=recent%20deployments"
```

## 5. Tune Behavior

```js
const ctx = new ContextEngine({
  dbPath: './context.db',        // Persist to file (default: in-memory)
  maxEvents: 500,                // Auto-prune after 500 events (default: 1000)
  decayHours: 8,                 // Events lose relevance faster (default: 24)
  deduplicationWindow: 30000,    // 30s dedup window (default: 60s)
})
```

## 6. Scale to Production

Switch to PostgreSQL + OpenAI embeddings:

```js
const ctx = new ContextEngine({
  storage: 'postgres',
  pgConnectionString: process.env.DATABASE_URL,
  embeddingProvider: 'openai',
  openaiApiKey: process.env.OPENAI_API_KEY,
})
```

Requires PostgreSQL with the [pgvector](https://github.com/pgvector/pgvector) extension.

## Next Steps

- Browse [examples/](../examples) for runnable code
- Read [Architecture Overview](./architecture.md) for how it works internally
- Read [Custom Adapters](./custom-adapters.md) to build your own storage or embedding backend
