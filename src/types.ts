export interface EventInput {
  type: string
  data: Record<string, unknown>
}

export interface StoredEvent {
  id: string
  type: string
  data: Record<string, unknown>
  timestamp: number
  embedding: number[]
  relevance: number
}

export interface ContextResult {
  summary: string
  events: StoredEvent[]
  query: string
  timestamp: number
}

export interface StorageAdapter {
  init(): Promise<void>
  insert(event: StoredEvent): Promise<void>
  search(embedding: number[], limit: number): Promise<StoredEvent[]>
  recent(limit: number): Promise<StoredEvent[]>
  count(): Promise<number>
  prune(maxEvents: number): Promise<number>
  findSimilar(embedding: number[], timeWindowMs: number, threshold: number): Promise<StoredEvent | null>
  updateRelevance(id: string, relevance: number): Promise<void>
  close(): Promise<void>
}

export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>
  dimensions: number
}

export interface EngineOptions {
  storage?: 'sqlite' | 'postgres'
  embeddingProvider?: 'openai' | 'local'
  maxEvents?: number
  decayHours?: number
  dbPath?: string
  pgConnectionString?: string
  openaiApiKey?: string
  deduplicationWindow?: number // ms, default 60000
  deduplicationThreshold?: number // cosine similarity, default 0.95
}
