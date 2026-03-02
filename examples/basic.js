/**
 * Basic Example: Event Ingestion & Semantic Querying
 *
 * Shows how to:
 * 1. Create a context engine
 * 2. Ingest events from different sources
 * 3. Query contextually with natural language
 */

import { ContextEngine } from 'context-engine-ai'

const ctx = new ContextEngine({
  dbPath: './context-example.db',
  decayHours: 24
})

async function main() {
  console.log('🚀 Context Engine Example\n')

  // Ingest events from different sources
  console.log('📥 Ingesting events...')

  await ctx.ingest({
    type: 'app_switch',
    data: { app: 'VS Code', file: 'context-engine/src/engine.ts', timestamp: new Date() }
  })

  await ctx.ingest({
    type: 'calendar',
    data: { event: 'Team standup', time: '10:30 AM', duration: '30min' }
  })

  await ctx.ingest({
    type: 'message',
    data: { from: 'Alice', text: 'Can you review the PR?', channel: '#engineering' }
  })

  await ctx.ingest({
    type: 'code_commit',
    data: { repo: 'context-engine', commit: 'docs: add badges', branch: 'main' }
  })

  // Query contextually
  console.log('\n🔍 Semantic Queries:\n')

  const workQuery = await ctx.query('what am I working on?')
  console.log('Q: "what am I working on?"')
  console.log(`A: ${workQuery.summary}\n`)

  const meetingQuery = await ctx.query('do I have any meetings coming up?')
  console.log('Q: "do I have any meetings coming up?"')
  console.log(`A: ${meetingQuery.summary}\n`)

  const commQuery = await ctx.query('any messages from team members?')
  console.log('Q: "any messages from team members?"')
  console.log(`A: ${commQuery.summary}\n`)

  // Recent events
  console.log('📋 Recent Events:')
  const recent = await ctx.recent(5)
  recent.forEach((e, i) => {
    console.log(`  ${i + 1}. [${e.type}] ${JSON.stringify(e.data).substring(0, 60)}...`)
  })

  await ctx.close()
  console.log('\n✅ Done!')
}

main().catch(console.error)
