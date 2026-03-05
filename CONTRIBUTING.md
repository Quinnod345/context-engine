# Contributing to context-engine-ai

Thanks for your interest. Contributions are welcome — bug fixes, new adapters, documentation improvements, and well-scoped new features.

## Before you open a PR

- For bug fixes and small improvements: open a PR directly.
- For new features or design changes: open an issue first to align on scope before writing code.

## Setup

```bash
git clone https://github.com/Quinnod345/context-engine.git
cd context-engine
npm install
npm run build   # compile TypeScript
npm test        # run the test suite (17 tests, should all pass)
npm run dev     # watch mode for development
```

## Project structure

```
src/
  engine.ts         — ContextEngine class (core logic)
  types.ts          — TypeScript interfaces and types
  utils.ts          — eventToText, cosineSimilarity, computeDecay
  storage/
    sqlite.ts       — SQLite StorageAdapter (default)
    postgres.ts     — PostgreSQL + pgvector StorageAdapter
  embeddings/
    local.ts        — TF-IDF + LSH EmbeddingProvider (default)
    openai.ts       — OpenAI text-embedding-3-small provider
  server.ts         — Express HTTP server (ctx.serve())
  cli.ts            — CLI entry point (npx context-engine-ai)
tests/
  engine.test.ts    — ContextEngine integration tests
  storage.test.ts   — SQLite storage adapter tests
  server.test.ts    — HTTP server endpoint tests
examples/           — Runnable example implementations
docs/               — Documentation site
```

## Adding a storage adapter

Implement the `StorageAdapter` interface from `src/types.ts`:

```ts
export interface StorageAdapter {
  init(): Promise<void>
  insert(event: StoredEvent): Promise<void>
  search(embedding: number[], limit: number): Promise<StoredEvent[]>
  findSimilar(embedding: number[], windowMs: number, threshold: number): Promise<StoredEvent | null>
  recent(limit: number): Promise<StoredEvent[]>
  count(): Promise<number>
  updateRelevance(id: string, relevance: number): Promise<void>
  prune(maxEvents: number): Promise<void>
  close(): Promise<void>
}
```

See `src/storage/sqlite.ts` for a complete reference implementation.

## Adding an embedding provider

Implement the `EmbeddingProvider` interface:

```ts
export interface EmbeddingProvider {
  dimensions: number
  embed(text: string): Promise<number[]>
}
```

The returned vector must be L2-normalized (cosine similarity expects this). See `src/embeddings/local.ts` for the reference implementation.

## Tests

All PRs should include tests. Run `npm test` before submitting. The test suite uses Vitest and runs against SQLite in-memory — no external dependencies needed.

If you're adding a new adapter or embedding provider, add tests in `tests/`.

## Code style

- TypeScript with strict types (no `any`)
- ESM modules (`import`/`export`, not `require`)
- Keep dependencies minimal — a new runtime dependency needs justification
- No build-time configuration changes without discussion

## Pull request checklist

- [ ] `npm run build` passes (no TypeScript errors)
- [ ] `npm test` passes (all 17 tests + any new tests you added)
- [ ] New behavior is covered by a test
- [ ] `CHANGELOG.md` updated under `[Unreleased]`

## What I'd love help with

- **New storage adapters**: Redis, DuckDB, Turso/libSQL, in-memory with persistence
- **New embedding providers**: Cohere, local ONNX models (via `@xenova/transformers`), Ollama
- **Performance**: benchmarks on large event sets, query optimization for pgvector
- **Examples**: real-world integrations (browser extension, VS Code extension, etc.)
- **Documentation**: improved quick-start, architecture explanations, recipes

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
