import type { StorageAdapter, StoredEvent } from '../types.js'
import { cosineSimilarity } from '../utils.js'
import Database from 'better-sqlite3'

export class SQLiteStorage implements StorageAdapter {
  private db: Database.Database

  constructor(dbPath: string = ':memory:') {
    this.db = new Database(dbPath)
    this.db.pragma('journal_mode = WAL')
  }

  async init(): Promise<void> {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        data TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        embedding TEXT NOT NULL,
        relevance REAL NOT NULL DEFAULT 1.0
      )
    `)
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp DESC)
    `)
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_events_relevance ON events(relevance DESC)
    `)
  }

  async insert(event: StoredEvent): Promise<void> {
    this.db.prepare(`
      INSERT OR REPLACE INTO events (id, type, data, timestamp, embedding, relevance)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      event.id,
      event.type,
      JSON.stringify(event.data),
      event.timestamp,
      JSON.stringify(event.embedding),
      event.relevance
    )
  }

  async search(embedding: number[], limit: number): Promise<StoredEvent[]> {
    const rows = this.db.prepare(`
      SELECT * FROM events ORDER BY relevance DESC LIMIT ?
    `).all(limit * 3) as Array<{
      id: string; type: string; data: string;
      timestamp: number; embedding: string; relevance: number
    }>

    const scored = rows.map(row => {
      const rowEmbedding = JSON.parse(row.embedding) as number[]
      const similarity = cosineSimilarity(embedding, rowEmbedding)
      return {
        event: this.rowToEvent(row),
        score: similarity * row.relevance,
      }
    })

    scored.sort((a, b) => b.score - a.score)
    return scored.slice(0, limit).map(s => s.event)
  }

  async recent(limit: number): Promise<StoredEvent[]> {
    const rows = this.db.prepare(`
      SELECT * FROM events ORDER BY timestamp DESC LIMIT ?
    `).all(limit) as Array<{
      id: string; type: string; data: string;
      timestamp: number; embedding: string; relevance: number
    }>
    return rows.map(r => this.rowToEvent(r))
  }

  async count(): Promise<number> {
    const row = this.db.prepare('SELECT COUNT(*) as cnt FROM events').get() as { cnt: number }
    return row.cnt
  }

  async prune(maxEvents: number): Promise<number> {
    const count = await this.count()
    if (count <= maxEvents) return 0
    const toDelete = count - maxEvents
    this.db.prepare(`
      DELETE FROM events WHERE id IN (
        SELECT id FROM events ORDER BY relevance ASC, timestamp ASC LIMIT ?
      )
    `).run(toDelete)
    return toDelete
  }

  async findSimilar(embedding: number[], timeWindowMs: number, threshold: number): Promise<StoredEvent | null> {
    const cutoff = Date.now() - timeWindowMs
    const rows = this.db.prepare(`
      SELECT * FROM events WHERE timestamp > ? ORDER BY timestamp DESC LIMIT 50
    `).all(cutoff) as Array<{
      id: string; type: string; data: string;
      timestamp: number; embedding: string; relevance: number
    }>

    for (const row of rows) {
      const rowEmbedding = JSON.parse(row.embedding) as number[]
      const similarity = cosineSimilarity(embedding, rowEmbedding)
      if (similarity >= threshold) {
        return this.rowToEvent(row)
      }
    }
    return null
  }

  async updateRelevance(id: string, relevance: number): Promise<void> {
    this.db.prepare('UPDATE events SET relevance = ? WHERE id = ?').run(relevance, id)
  }

  async close(): Promise<void> {
    this.db.close()
  }

  private rowToEvent(row: { id: string; type: string; data: string; timestamp: number; embedding: string; relevance: number }): StoredEvent {
    return {
      id: row.id,
      type: row.type,
      data: JSON.parse(row.data),
      timestamp: row.timestamp,
      embedding: JSON.parse(row.embedding),
      relevance: row.relevance,
    }
  }
}
