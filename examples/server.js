/**
 * HTTP Server Example
 *
 * Start a context engine as an HTTP service.
 * Then hit the endpoints from your application.
 */

import { ContextEngine } from 'context-engine-ai'

const ctx = new ContextEngine({
  dbPath: './context-server.db'
})

const server = ctx.serve(3334)

console.log('🚀 Context Engine HTTP Server')
console.log('Listening on http://localhost:3334\n')
console.log('Available endpoints:')
console.log('  POST   /ingest         - ingest an event')
console.log('  GET    /context?q=...  - semantic query')
console.log('  GET    /recent?limit=20 - get recent events')
console.log('  GET    /health         - health check\n')

console.log('Example requests:')
console.log('\nIngest an event:')
console.log('  curl -X POST http://localhost:3334/ingest \\')
console.log("    -H 'Content-Type: application/json' \\")
console.log("    -d '{\"type\": \"app_switch\", \"data\": {\"app\": \"VS Code\"}}'")

console.log('\nQuery context:')
console.log('  curl "http://localhost:3334/context?q=what%20am%20I%20working%20on"')

console.log('\nGet recent events:')
console.log('  curl "http://localhost:3334/recent?limit=10"')

process.on('SIGINT', async () => {
  console.log('\n\n👋 Shutting down...')
  await ctx.close()
  process.exit(0)
})
