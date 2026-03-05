# Changelog

All notable changes to context-engine-ai are documented here.

## [0.2.1] - 2026-03-04

### Fixed
- CLI `--version` now reports the correct version (was hardcoded to `0.1.0`)

### Added
- `engine.count()` — returns the number of events currently stored
- `engine.clear()` — removes all stored events
- HTTP `GET /count` — returns `{ count: number }` from the running server
- HTTP `DELETE /events` — clears all events from the running server
- Tests for `count()`, `clear()`, and the new HTTP endpoints (17 tests total)

## [0.2.0] - 2026-03-02

### Added
- Dual CLI binary: install as `context-engine` or `context-engine-ai`
- Full TypeScript types exported from the package
- Example implementations: `basic.js`, `server.js`, `ai-agent.js`, `webhook-server.js`
- Comprehensive README with API reference, comparison table, and use cases
- Benchmarks: ~0.1ms ingest, ~0.1ms query (local TF-IDF + SQLite, 1000 events)
- `funding` field in package.json

### Changed
- Improved npm keywords for discoverability
- Clearer description in package.json

## [0.1.0] - 2026-03-01

### Added
- Initial release
- `ContextEngine` class with `ingest()`, `query()`, `recent()`, `serve()`, `close()`
- SQLite storage adapter (default, zero config, in-memory or file)
- PostgreSQL + pgvector storage adapter
- Local TF-IDF embedding provider (no API keys, deterministic)
- OpenAI embedding provider (`text-embedding-3-small`)
- Temporal decay scoring
- Deduplication with configurable window and cosine similarity threshold
- Auto-pruning when event limit is reached
- HTTP REST server (`/ingest`, `/context`, `/recent`, `/health`)
- CLI (`context-engine serve`, `context-engine demo`)
- 14 passing tests across storage, engine, and server
- CI on Node 18, 20, 22
