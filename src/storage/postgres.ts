import type { StorageAdapter, StoredEvent } from '../types.js'
import pg from 'pg'

export class PostgresStorage implements StorageAdapter {
  private pool: pg.Pool
  private dimensions: number

  constructor(connectionString?: string, dimensions = 1536) {
    this.pool = new pg.Pool({
      connectionString: connectionString || process.env.DATABASE_URL,
    })
    this.dimensions = dimensions
  }

  async init(): Promise<void> {
    const client = await this.pool.connect()
    try {
      await client.query('CREATE EXTENSION IF NOT EXISTS vector')
      await client.query(`
        CREATE TABLE IF NOT EXISTS context_events (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          data JSONB NOT NULL,
          timestamp BIGINT NOT NULL,
          embedding vector(${this.dimensions}),
          relevance DOUBLE PRECISION NOT NULL DEFAULT 1.0
        )
      `)
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_context_events_timestamp ON context_events(timestamp DESC)
      `)
    } finally {
      client.release()
    }
  }

  async insert(event: StoredEvent): Promise<void> {
    await this.pool.query(`
      INSERT INTO context_events (id, type, data, timestamp, embedding, relevance)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO UPDATE SET
        data = $3, timestamp = $4, embedding = $5, relevance = $6
    `, [
      event.id,
      event.type,
      JSON.stringify(event.data),
      event.timestamp,
      `[${event.embedding.join(',')}]`,
      event.relevance,
    ])
  }

  async search(embedding: number[], limit: number): Promise<StoredEvent[]> {
    const embStr = `[${embedding.join(',')}]`
    const result = await this.pool.query(`
      SELECT *, 1 - (embedding <=> $1::vector) as similarity
      FROM context_events
      ORDER BY (1 - (embedding <=> $1::vector)) * relevance DESC
      LIMIT $2
    `, [embStr, limit])
    return result.rows.map(r => this.rowToEvent(r))
  }

  async recent(limit: number): Promise<StoredEvent[]> {
    const result = await this.pool.query(
      'SELECT * FROM context_events ORDER BY timestamp DESC LIMIT $1',
      [limit]
    )
    return result.rows.map(r => this.rowToEvent(r))
  }

  async count(): Promise<number> {
    const result = await this.pool.query('SELECT COUNT(*) as cnt FROM context_events')
    return parseInt(result.rows[0].cnt)
  }

  async prune(maxEvents: number): Promise<number> {
    const count = await this.count()
    if (count <= maxEvents) return 0
    const toDelete = count - maxEvents
    await this.pool.query(`
      DELETE FROM context_events WHERE id IN (
        SELECT id FROM context_events ORDER BY relevance ASC, timestamp ASC LIMIT $1
      )
    `, [toDelete])
    return toDelete
  }

  async findSimilar(embedding: number[], timeWindowMs: number, threshold: number): Promise<StoredEvent | null> {
    const cutoff = Date.now() - timeWindowMs
    const embStr = `[${embedding.join(',')}]`
    const result = await this.pool.query(`
      SELECT *, 1 - (embedding <=> $1::vector) as similarity
      FROM context_events
      WHERE timestamp > $2
      ORDER BY embedding <=> $1::vector ASC
      LIMIT 1
    `, [embStr, cutoff])
    if (result.rows.length > 0 && result.rows[0].similarity >= threshold) {
      return this.rowToEvent(result.rows[0])
    }
    return null
  }

  async updateRelevance(id: string, relevance: number): Promise<void> {
    await this.pool.query(
      'UPDATE context_events SET relevance = $1 WHERE id = $2',
      [relevance, id]
    )
  }

  async close(): Promise<void> {
    await this.pool.end()
  }

  private rowToEvent(row: Record<string, unknown>): StoredEvent {
    return {
      id: row.id as string,
      type: row.type as string,
      data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data as Record<string, unknown>,
      timestamp: Number(row.timestamp),
      embedding: typeof row.embedding === 'string' ? JSON.parse(row.embedding) : (row.embedding as number[] || []),
      relevance: row.relevance as number,
    }
  }
}
