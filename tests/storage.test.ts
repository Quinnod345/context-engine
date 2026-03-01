import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { SQLiteStorage } from '../src/storage/sqlite.js'
import type { StoredEvent } from '../src/types.js'

describe('SQLiteStorage', () => {
  let storage: SQLiteStorage

  beforeEach(async () => {
    storage = new SQLiteStorage(':memory:')
    await storage.init()
  })

  afterEach(async () => {
    await storage.close()
  })

  const makeEvent = (id: string, type: string, ts?: number): StoredEvent => ({
    id,
    type,
    data: { test: true },
    timestamp: ts || Date.now(),
    embedding: Array.from({ length: 10 }, () => Math.random()),
    relevance: 1.0,
  })

  it('should insert and retrieve events', async () => {
    const event = makeEvent('1', 'test')
    await storage.insert(event)
    const count = await storage.count()
    expect(count).toBe(1)
    const recent = await storage.recent(10)
    expect(recent[0].id).toBe('1')
    expect(recent[0].type).toBe('test')
  })

  it('should return recent in timestamp order', async () => {
    await storage.insert(makeEvent('1', 'a', 1000))
    await storage.insert(makeEvent('2', 'b', 3000))
    await storage.insert(makeEvent('3', 'c', 2000))
    const recent = await storage.recent(3)
    expect(recent.map(e => e.id)).toEqual(['2', '3', '1'])
  })

  it('should prune lowest relevance events', async () => {
    const e1 = makeEvent('1', 'a')
    e1.relevance = 0.1
    const e2 = makeEvent('2', 'b')
    e2.relevance = 0.9
    const e3 = makeEvent('3', 'c')
    e3.relevance = 0.5
    await storage.insert(e1)
    await storage.insert(e2)
    await storage.insert(e3)
    const pruned = await storage.prune(2)
    expect(pruned).toBe(1)
    const count = await storage.count()
    expect(count).toBe(2)
  })

  it('should update relevance', async () => {
    await storage.insert(makeEvent('1', 'test'))
    await storage.updateRelevance('1', 0.5)
    const recent = await storage.recent(1)
    expect(recent[0].relevance).toBe(0.5)
  })

  it('should search by embedding similarity', async () => {
    const embedding = [1, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    const e1 = makeEvent('1', 'similar')
    e1.embedding = [0.9, 0.1, 0, 0, 0, 0, 0, 0, 0, 0]
    const e2 = makeEvent('2', 'different')
    e2.embedding = [0, 0, 0, 0, 0, 0, 0, 0, 0, 1]
    await storage.insert(e1)
    await storage.insert(e2)
    const results = await storage.search(embedding, 1)
    expect(results[0].type).toBe('similar')
  })
})
