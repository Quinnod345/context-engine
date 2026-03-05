#!/usr/bin/env node
import { Command } from 'commander'
import { createRequire } from 'module'
import { ContextEngine } from './engine.js'

const require = createRequire(import.meta.url)
const { version } = require('../package.json') as { version: string }

const program = new Command()

program
  .name('context-engine')
  .description('Context engine for AI agents')
  .version(version)

program
  .command('serve')
  .description('Start the HTTP server')
  .option('-p, --port <port>', 'Port to listen on', '3334')
  .option('-s, --storage <type>', 'Storage backend (sqlite|postgres)', 'sqlite')
  .option('--db-path <path>', 'SQLite database path', 'context-engine.db')
  .option('--pg-url <url>', 'PostgreSQL connection string')
  .option('--embeddings <type>', 'Embedding provider (local|openai)', 'local')
  .option('--max-events <n>', 'Maximum events to store', '1000')
  .option('--decay-hours <n>', 'Decay half-life in hours', '24')
  .action(async (opts) => {
    const engine = new ContextEngine({
      storage: opts.storage as 'sqlite' | 'postgres',
      embeddingProvider: opts.embeddings as 'local' | 'openai',
      dbPath: opts.dbPath,
      pgConnectionString: opts.pgUrl,
      maxEvents: parseInt(opts.maxEvents),
      decayHours: parseInt(opts.decayHours),
    })

    engine.serve(parseInt(opts.port))
  })

program
  .command('demo')
  .description('Run an interactive demo showing event ingestion and querying')
  .action(async () => {
    const engine = new ContextEngine()

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

    console.log('\n  context-engine demo\n')
    console.log('  Simulating developer workflow...\n')

    for (const event of events) {
      await engine.ingest(event)
      const label = `[${event.type}]`.padEnd(12)
      const detail = Object.entries(event.data).map(([k, v]) => `${k}: ${v}`).join(', ')
      console.log(`    ${label} ${detail}`)
    }

    const questions = [
      'messages from slack?',
      'next meeting?',
      'test results?',
      'latest commit?',
    ]

    console.log(`\n  ${events.length} events ingested. Querying...\n`)

    for (const q of questions) {
      const result = await engine.query(q, 3)
      console.log(`  Q: "${q}"`)
      console.log(`  A: ${result.summary || '(no matching events)'}`)
      console.log()
    }

    await engine.close()
    console.log('  Zero config. Zero API keys. Just context.\n')
  })

program.parse()
