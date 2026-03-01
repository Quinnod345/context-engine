#!/usr/bin/env node
import { Command } from 'commander'
import { ContextEngine } from './engine.js'

const program = new Command()

program
  .name('context-engine')
  .description('Context engine for AI agents')
  .version('0.1.0')

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

program.parse()
