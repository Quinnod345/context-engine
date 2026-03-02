/**
 * Agent Context Example
 *
 * Shows how to use context-engine-ai to build a context summary
 * that you can inject into an AI agent's system prompt.
 */

import { ContextEngine } from 'context-engine-ai'

const ctx = new ContextEngine({ dbPath: './agent-context.db' })

async function main() {
  // Simulate a stream of user activity events
  const events = [
    { type: 'app_switch', data: { app: 'VS Code', file: 'src/engine.ts', project: 'context-engine' } },
    { type: 'terminal', data: { command: 'npm test', output: '14 passing', cwd: '/projects/context-engine' } },
    { type: 'browser', data: { url: 'https://docs.github.com/actions', title: 'GitHub Actions docs' } },
    { type: 'calendar', data: { event: '1:1 with Sarah', time: '2:00 PM', in: '45min' } },
    { type: 'message', data: { from: 'Sarah', text: 'Can we talk about the CI pipeline in our 1:1?', app: 'Slack' } },
    { type: 'app_switch', data: { app: 'VS Code', file: '.github/workflows/ci.yml', project: 'context-engine' } },
  ]

  console.log('Ingesting activity events...\n')
  for (const event of events) {
    await ctx.ingest(event)
    // Small delay to give events distinct timestamps
    await new Promise(r => setTimeout(r, 50))
  }

  // Build a context block for an AI agent prompt
  const workContext = await ctx.query('what is the user working on right now?', 5)
  const upcomingContext = await ctx.query('what meetings or events are coming up?', 3)
  const messageContext = await ctx.query('any recent messages from teammates?', 3)

  const contextBlock = `
## Current Context

**What the user is doing:**
${workContext.summary}

**Upcoming:**
${upcomingContext.summary}

**Recent messages:**
${messageContext.summary}

**Recent activity (last ${events.length} events):**
${(await ctx.recent(5)).map(e => `- [${e.type}] ${Object.entries(e.data).filter(([k]) => !k.startsWith('_')).map(([k, v]) => `${k}: ${v}`).join(', ')}`).join('\n')}
`.trim()

  console.log('=== Context Block for Agent Prompt ===\n')
  console.log(contextBlock)

  console.log('\n\n=== Example System Prompt ===\n')
  console.log(`You are a helpful assistant. Here is the user's current context:

${contextBlock}

Use this context to give relevant, timely responses. For example, if the user
is working on CI configuration and has a meeting about CI coming up, you might
proactively connect those topics.`)

  await ctx.close()
}

main().catch(console.error)
