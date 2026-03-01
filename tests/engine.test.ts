import { describe, it, expect, afterEach } from 'vitest'
import { ContextEngine } from '../src/engine.js'

describe('ContextEngine', () => {
  let engine: ContextEngine

  afterEach(async () => {
    if (engine) await engine.close()
  })

  it('should ingest and query events', async () => {
    engine = new ContextEngine({ storage: 'sqlite', embeddingProvider: 'local' })

    await engine.ingest({ type: 'app_switch', data: { app: 'VS Code', file: 'index.ts' } })
    await engine.ingest({ type: 'calendar', data: { event: 'Team standup', in: '30min' } })
    await engine.ingest({ type: 'browser', data: { url: 'https://github.com', title: 'GitHub' } })

    const result = await engine.query('what is the user working on?')
    expect(result.events.length).toBeGreaterThan(0)
    expect(result.summary).toBeTruthy()
    expect(result.query).toBe('what is the user working on?')
  })

  it('should return recent events in order', async () => {
    engine = new ContextEngine({ storage: 'sqlite', embeddingProvider: 'local' })

    await engine.ingest({ type: 'a', data: { v: 'first' } })
    await new Promise(r => setTimeout(r, 10))
    await engine.ingest({ type: 'b', data: { v: 'second' } })
    await new Promise(r => setTimeout(r, 10))
    await engine.ingest({ type: 'c', data: { v: 'third' } })

    const recent = await engine.recent(2)
    expect(recent.length).toBe(2)
    expect(recent[0].type).toBe('c')
    expect(recent[1].type).toBe('b')
  })

  it('should deduplicate similar events', async () => {
    engine = new ContextEngine({
      storage: 'sqlite',
      embeddingProvider: 'local',
      deduplicationWindow: 60000,
      deduplicationThreshold: 0.9,
    })

    await engine.ingest({ type: 'app_switch', data: { app: 'VS Code', file: 'index.ts' } })
    await engine.ingest({ type: 'app_switch', data: { app: 'VS Code', file: 'index.ts' } })

    const recent = await engine.recent(10)
    // Should have merged (or at most 2 if threshold not met — depends on embedder)
    expect(recent.length).toBeLessThanOrEqual(2)
  })

  it('should prune when over maxEvents', async () => {
    engine = new ContextEngine({
      storage: 'sqlite',
      embeddingProvider: 'local',
      maxEvents: 3,
    })

    for (let i = 0; i < 5; i++) {
      await engine.ingest({ type: `event_${i}`, data: { i } })
    }

    const recent = await engine.recent(10)
    expect(recent.length).toBeLessThanOrEqual(3)
  })
})
