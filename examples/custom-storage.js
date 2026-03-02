/**
 * Custom Storage Example
 *
 * Shows how to use the storage adapters and embedding providers
 * directly, outside of the ContextEngine class.
 *
 * Useful when you want fine-grained control or are building
 * a custom integration.
 */

import {
  SQLiteStorage,
  LocalEmbeddingProvider,
  cosineSimilarity,
  eventToText,
} from 'context-engine-ai'
import { randomUUID } from 'crypto'

async function main() {
  // Initialize storage and embedder separately
  const storage = new SQLiteStorage('./custom-storage.db')
  await storage.init()

  const embedder = new LocalEmbeddingProvider()
  console.log(`Embedding dimensions: ${embedder.dimensions}`)

  // Manually embed and store events
  const events = [
    { type: 'code_edit', data: { file: 'auth.ts', action: 'added OAuth2 flow' } },
    { type: 'code_edit', data: { file: 'database.ts', action: 'added connection pooling' } },
    { type: 'test_run', data: { suite: 'auth', passed: 12, failed: 0 } },
    { type: 'deploy', data: { env: 'staging', version: '1.2.0', status: 'success' } },
  ]

  console.log('\nStoring events...')
  for (const event of events) {
    const text = eventToText(event.type, event.data)
    const embedding = await embedder.embed(text)

    await storage.insert({
      id: randomUUID(),
      type: event.type,
      data: event.data,
      timestamp: Date.now(),
      embedding,
      relevance: 1.0,
    })
    console.log(`  Stored: [${event.type}] ${text.slice(0, 60)}`)
  }

  // Manual similarity search
  const query = 'what was deployed?'
  const queryEmbedding = await embedder.embed(query)
  const results = await storage.search(queryEmbedding, 2)

  console.log(`\nQuery: "${query}"`)
  console.log('Results:')
  results.forEach((e, i) => {
    const sim = cosineSimilarity(queryEmbedding, e.embedding)
    console.log(`  ${i + 1}. [${e.type}] similarity=${sim.toFixed(3)} -- ${JSON.stringify(e.data)}`)
  })

  // Check event count
  const count = await storage.count()
  console.log(`\nTotal events stored: ${count}`)

  // Prune to keep only 2 most relevant
  const pruned = await storage.prune(2)
  console.log(`Pruned ${pruned} events (keeping 2)`)
  console.log(`Events remaining: ${await storage.count()}`)

  await storage.close()
  console.log('\nDone!')
}

main().catch(console.error)
