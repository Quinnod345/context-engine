/**
 * Webhook Server Example: Multi-source event ingestion
 *
 * A production-style webhook receiver that ingests events from:
 * - GitHub (PRs, pushes, issues)
 * - Slack (messages)
 * - Custom sources (any JSON POST)
 *
 * Plus a /context endpoint your tools can query.
 *
 * Usage:
 *   node examples/webhook-server.js
 *
 * Then:
 *   # Ingest a GitHub-style webhook
 *   curl -X POST http://localhost:4000/webhook/github \
 *     -H 'Content-Type: application/json' \
 *     -d '{"action":"opened","pull_request":{"title":"Fix auth bug","user":{"login":"alice"}},"repository":{"full_name":"myorg/api"}}'
 *
 *   # Ingest a Slack-style event
 *   curl -X POST http://localhost:4000/webhook/slack \
 *     -H 'Content-Type: application/json' \
 *     -d '{"event":{"type":"message","channel":"#general","user":"bob","text":"deploy looks good"}}'
 *
 *   # Ingest any custom event
 *   curl -X POST http://localhost:4000/webhook/custom \
 *     -H 'Content-Type: application/json' \
 *     -d '{"type":"deploy","data":{"service":"api","version":"2.1.0","status":"success"}}'
 *
 *   # Query what's happening
 *   curl "http://localhost:4000/context?q=any%20issues%20with%20deployments"
 */

import express from 'express'
import { ContextEngine } from 'context-engine-ai'

const ctx = new ContextEngine({
  dbPath: './webhook-context.db',
  maxEvents: 5000,
  decayHours: 48,
})

const app = express()
app.use(express.json())

// GitHub webhooks
app.post('/webhook/github', async (req, res) => {
  try {
    const { action, pull_request, pusher, commits, repository, issue } = req.body

    if (pull_request) {
      await ctx.ingest({
        type: 'github_pr',
        data: {
          action,
          title: pull_request.title,
          repo: repository?.full_name,
          author: pull_request.user?.login,
          number: pull_request.number,
        }
      })
    } else if (commits) {
      await ctx.ingest({
        type: 'github_push',
        data: {
          pusher: pusher?.name,
          repo: repository?.full_name,
          commits: commits.length,
          message: commits[0]?.message,
        }
      })
    } else if (issue) {
      await ctx.ingest({
        type: 'github_issue',
        data: {
          action,
          title: issue.title,
          repo: repository?.full_name,
          author: issue.user?.login,
        }
      })
    }

    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Slack events
app.post('/webhook/slack', async (req, res) => {
  try {
    // Handle Slack URL verification challenge
    if (req.body.challenge) {
      res.json({ challenge: req.body.challenge })
      return
    }

    const { event } = req.body
    if (event?.type === 'message' && !event.bot_id) {
      await ctx.ingest({
        type: 'slack_message',
        data: {
          channel: event.channel,
          user: event.user,
          text: event.text?.slice(0, 300),
        }
      })
    }

    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Generic custom webhook — POST any {type, data}
app.post('/webhook/custom', async (req, res) => {
  try {
    const { type, data } = req.body
    if (!type || !data) {
      res.status(400).json({ error: 'Body must include "type" and "data"' })
      return
    }
    const event = await ctx.ingest({ type, data })
    res.json({ ok: true, id: event.id })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Context query endpoint
app.get('/context', async (req, res) => {
  try {
    const q = req.query.q
    if (!q) {
      res.status(400).json({ error: 'Missing query parameter "q"' })
      return
    }
    const limit = parseInt(req.query.limit) || 10
    const result = await ctx.query(q, limit)
    res.json(result)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Recent events
app.get('/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20
    const events = await ctx.recent(limit)
    res.json({ events })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/health', (_req, res) => res.json({ ok: true }))

const PORT = process.env.PORT || 4000
app.listen(PORT, () => {
  console.log(`Webhook Context Server listening on http://localhost:${PORT}\n`)
  console.log('Endpoints:')
  console.log(`  POST /webhook/github   - GitHub webhook events`)
  console.log(`  POST /webhook/slack    - Slack event subscriptions`)
  console.log(`  POST /webhook/custom   - Any {type, data} event`)
  console.log(`  GET  /context?q=...    - Semantic context query`)
  console.log(`  GET  /recent?limit=20  - Recent events`)
  console.log(`  GET  /health           - Health check`)
})

process.on('SIGINT', async () => {
  console.log('\nShutting down...')
  await ctx.close()
  process.exit(0)
})
