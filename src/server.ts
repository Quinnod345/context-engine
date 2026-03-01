import express from 'express'
import type { ContextEngine } from './engine.js'

export function createServer(engine: ContextEngine): express.Express {
  const app = express()
  app.use(express.json())

  app.post('/ingest', async (req, res) => {
    try {
      const { type, data } = req.body
      if (!type || !data) {
        res.status(400).json({ error: 'Missing type or data' })
        return
      }
      const event = await engine.ingest({ type, data })
      res.json({ ok: true, event: { id: event.id, type: event.type, timestamp: event.timestamp } })
    } catch (err) {
      res.status(500).json({ error: (err as Error).message })
    }
  })

  app.get('/context', async (req, res) => {
    try {
      const q = req.query.q as string
      if (!q) {
        res.status(400).json({ error: 'Missing query parameter q' })
        return
      }
      const limit = parseInt(req.query.limit as string) || 10
      const result = await engine.query(q, limit)
      res.json(result)
    } catch (err) {
      res.status(500).json({ error: (err as Error).message })
    }
  })

  app.get('/recent', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20
      const events = await engine.recent(limit)
      res.json({ events })
    } catch (err) {
      res.status(500).json({ error: (err as Error).message })
    }
  })

  app.get('/health', (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() })
  })

  return app
}
