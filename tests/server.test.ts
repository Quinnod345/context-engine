import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { ContextEngine } from '../src/engine.js'
import type { Server } from 'http'

describe('HTTP Server', () => {
  let engine: ContextEngine
  let server: Server
  let port: number

  beforeAll(async () => {
    engine = new ContextEngine({ storage: 'sqlite', embeddingProvider: 'local' })
    // Find a free port
    port = 10000 + Math.floor(Math.random() * 50000)
    server = engine.serve(port)
    await new Promise(r => setTimeout(r, 200))
  })

  afterAll(async () => {
    await engine.close()
  })

  it('should respond to health check', async () => {
    const res = await fetch(`http://localhost:${port}/health`)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  it('should ingest events via POST', async () => {
    const res = await fetch(`http://localhost:${port}/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'test', data: { hello: 'world' } }),
    })
    const body = await res.json() as { ok: boolean; event: { id: string } }
    expect(body.ok).toBe(true)
    expect(body.event.id).toBeTruthy()
  })

  it('should reject ingest without type', async () => {
    const res = await fetch(`http://localhost:${port}/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: { hello: 'world' } }),
    })
    expect(res.status).toBe(400)
  })

  it('should query context', async () => {
    // Ingest something first
    await fetch(`http://localhost:${port}/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'coding', data: { lang: 'typescript', file: 'main.ts' } }),
    })

    const res = await fetch(`http://localhost:${port}/context?q=what+language`)
    const body = await res.json() as { events: unknown[]; summary: string }
    expect(body.events.length).toBeGreaterThan(0)
    expect(body.summary).toBeTruthy()
  })

  it('should get recent events', async () => {
    const res = await fetch(`http://localhost:${port}/recent?limit=5`)
    const body = await res.json() as { events: unknown[] }
    expect(Array.isArray(body.events)).toBe(true)
  })
})
