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
  { type: 'app_switch',  data: { app: 'VS Code', file: 'src/auth.ts', project: 'myapp' } },
  { type: 'terminal',    data: { command: 'npm test', result: '47 passing, 2 failing' } },
  { type: 'message',     data: { from: 'Alice', text: 'The auth bug is back — can you look?', app: 'Slack' } },
  { type: 'browser',     data: { url: 'https://oauth.net/2/', title: 'OAuth 2.0 — oauth.net' } },
  { type: 'calendar',    data: { event: 'Sprint Review', in: '25 minutes' } },
  { type: 'code_save',   data: { file: 'src/auth.ts', lines_changed: 14, action: 'fix token refresh' } },
  { type: 'terminal',    data: { command: 'npm test', result: '49 passing, 0 failing' } },
  { type: 'git_commit',  data: { message: 'fix: token refresh race condition', files: 3 } },
]

const questions = [
  'what is the user working on?',
  'are there any upcoming meetings?',
  'what messages need attention?',
  'did tests pass?',
  'what was the last thing committed?',
]

async function main() {
  console.log('\n  context-engine demo\n')
  console.log('  Simulating developer workflow...\n')

  for (const event of events) {
    await ctx.ingest(event)
    const label = `[${event.type}]`.padEnd(14)
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
