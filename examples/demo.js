#!/usr/bin/env node
/**
 * Interactive Demo — Try context-engine in 30 seconds
 *
 * Run: npx context-engine-ai demo
 *   or: node examples/demo.js
 *
 * Simulates a developer's workflow and shows how context-engine
 * answers natural language questions about what's happening.
 */

import { ContextEngine } from 'context-engine-ai'

const ctx = new ContextEngine() // in-memory, zero config

const events = [
  { type: 'editor',    data: { app: 'VS Code', file: 'src/auth.ts', project: 'backend' } },
  { type: 'test',      data: { command: 'npm test', result: '47 passed, 2 failed' } },
  { type: 'message',   data: { from: 'Alice', via: 'Slack', text: 'auth token bug is back' } },
  { type: 'browser',   data: { url: 'oauth.net/2', title: 'OAuth 2.0 docs' } },
  { type: 'meeting',   data: { title: 'Sprint Review', starts_in: '25 minutes' } },
  { type: 'editor',    data: { app: 'VS Code', file: 'src/auth.ts', change: 'fix token refresh' } },
  { type: 'test',      data: { command: 'npm test', result: '49 passed, 0 failed' } },
  { type: 'commit',    data: { message: 'fix: token refresh race condition', files: 3 } },
]

const questions = [
  'messages from slack?',
  'next meeting?',
  'test results?',
  'latest commit?',
]

async function main() {
  console.log('\n  context-engine demo\n')
  console.log('  Simulating developer workflow...\n')

  for (const event of events) {
    await ctx.ingest(event)
    const label = `[${event.type}]`.padEnd(12)
    const detail = Object.entries(event.data)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ')
    console.log(`    ${label} ${detail}`)
    await new Promise(r => setTimeout(r, 100))
  }

  console.log(`\n  ${events.length} events ingested. Querying...\n`)

  for (const q of questions) {
    const result = await ctx.query(q, 3)
    console.log(`  Q: "${q}"`)
    console.log(`  A: ${result.summary || '(no matching events)'}`)
    console.log()
  }

  await ctx.close()
  console.log('  Zero config. Zero API keys. Just context.\n')
}

main().catch(console.error)
