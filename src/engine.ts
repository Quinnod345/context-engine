import { v4 as uuid } from 'uuid'
import type { ContextResult, EmbeddingProvider, EngineOptions, EventInput, StorageAdapter, StoredEvent } from './types.js'
import { SQLiteStorage } from './storage/sqlite.js'
import { PostgresStorage } from './storage/postgres.js'
import { LocalEmbeddingProvider } from './embeddings/local.js'
import { OpenAIEmbeddingProvider } from './embeddings/openai.js'
import { computeDecay, eventToText } from './utils.js'
import { createServer } from './server.js'
import type { Server } from 'http'

export class ContextEngine {
  private storage: StorageAdapter
  private embedder: EmbeddingProvider
  private maxEvents: number
  private decayHours: number
  private deduplicationWindow: number
  private deduplicationThreshold: number
  private initialized = false
  private httpServer: Server | null = null

  constructor(options: EngineOptions = {}) {
    const {
      storage = 'sqlite',
      embeddingProvider = 'local',
      maxEvents = 1000,
      decayHours = 24,
      dbPath,
      pgConnectionString,
      openaiApiKey,
      deduplicationWindow = 60000,
      deduplicationThreshold = 0.95,
    } = options

    this.maxEvents = maxEvents
    this.decayHours = decayHours
    this.deduplicationWindow = deduplicationWindow
    this.deduplicationThreshold = deduplicationThreshold

    // Embeddings (init first so storage can use dimensions)
    if (embeddingProvider === 'openai') {
      this.embedder = new OpenAIEmbeddingProvider(openaiApiKey)
    } else {
      this.embedder = new LocalEmbeddingProvider()
    }

    // Storage
    if (storage === 'postgres') {
      this.storage = new PostgresStorage(pgConnectionString, this.embedder.dimensions)
    } else {
      this.storage = new SQLiteStorage(dbPath)
    }
  }

  private async ensureInit(): Promise<void> {
    if (!this.initialized) {
      await this.storage.init()
      this.initialized = true
    }
  }

  async ingest(input: EventInput): Promise<StoredEvent> {
    await this.ensureInit()

    const text = eventToText(input.type, input.data)
    const embedding = await this.embedder.embed(text)
    const now = Date.now()

    // Deduplication: check for similar recent events
    const existing = await this.storage.findSimilar(
      embedding,
      this.deduplicationWindow,
      this.deduplicationThreshold
    )

    if (existing) {
      // Merge: update timestamp and boost relevance
      existing.timestamp = now
      existing.relevance = Math.min(existing.relevance + 0.1, 1.0)
      existing.data = { ...existing.data, ...input.data, _mergeCount: ((existing.data._mergeCount as number) || 1) + 1 }
      await this.storage.updateRelevance(existing.id, existing.relevance)
      return existing
    }

    const event: StoredEvent = {
      id: uuid(),
      type: input.type,
      data: input.data,
      timestamp: now,
      embedding,
      relevance: 1.0,
    }

    await this.storage.insert(event)

    // Prune if over limit
    await this.storage.prune(this.maxEvents)

    return event
  }

  async query(q: string, limit = 10): Promise<ContextResult> {
    await this.ensureInit()

    const embedding = await this.embedder.embed(q)
    const events = await this.storage.search(embedding, limit)
    const now = Date.now()

    // Apply decay to results
    const decayed = events.map(e => ({
      ...e,
      relevance: e.relevance * computeDecay(e.timestamp, now, this.decayHours),
    }))

    decayed.sort((a, b) => b.relevance - a.relevance)

    // Build summary from top events
    const summary = decayed
      .slice(0, 5)
      .map(e => `[${e.type}] ${Object.entries(e.data).filter(([k]) => !k.startsWith('_')).map(([k, v]) => `${k}: ${v}`).join(', ')}`)
      .join(' | ')

    return {
      summary,
      events: decayed,
      query: q,
      timestamp: now,
    }
  }

  async recent(limit = 20): Promise<StoredEvent[]> {
    await this.ensureInit()
    return this.storage.recent(limit)
  }

  serve(port = 3334): Server {
    const app = createServer(this)
    this.httpServer = app.listen(port, () => {
      console.log(`Context Engine serving on http://localhost:${port}`)
    })
    return this.httpServer
  }

  async close(): Promise<void> {
    if (this.httpServer) {
      await new Promise<void>((resolve) => this.httpServer!.close(() => resolve()))
    }
    await this.storage.close()
  }

  // Expose for server
  get _storage() { return this.storage }
  get _embedder() { return this.embedder }
}
