/**
 * AI Agent Example: Feed real-time context to Claude
 *
 * Shows how to:
 * 1. Ingest events from multiple sources
 * 2. Query context when the agent needs situational awareness
 * 3. Pass context into the system prompt
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... node examples/ai-agent.js
 *
 * (Works without the API key too — just skips the Claude call and prints the context)
 */

import { ContextEngine } from 'context-engine-ai'

const ctx = new ContextEngine({
  dbPath: './agent-context-example.db',
  decayHours: 8,
  maxEvents: 500,
})

async function main() {
  console.log('Context Engine + AI Agent Example\n')

  // Simulate a stream of real events
  console.log('Ingesting events...')

  await ctx.ingest({ type: 'app_switch', data: { app: 'VS Code', file: 'src/auth.ts', workspace: 'my-saas' } })
  await ctx.ingest({ type: 'terminal', data: { command: 'npm test', output: '3 failed, 12 passed', cwd: '/Users/dev/my-saas' } })
  await ctx.ingest({ type: 'calendar', data: { event: 'Sprint planning', time: '2:00 PM', duration: '1h', attendees: 8 } })
  await ctx.ingest({ type: 'slack_message', data: { from: 'Sarah', channel: '#backend', text: 'Auth service is throwing 401s in staging' } })
  await ctx.ingest({ type: 'github_notification', data: { type: 'review_requested', repo: 'my-saas', pr: '#142', title: 'Fix OAuth token refresh' } })
  await ctx.ingest({ type: 'error_log', data: { service: 'auth-service', error: 'TokenExpiredError', count: 47, window: '15min' } })

  console.log(`  6 events ingested\n`)

  // Query: what should the agent focus on?
  const context = await ctx.query('what needs immediate attention?', 5)
  console.log('Context query: "what needs immediate attention?"')
  console.log(`Summary: ${context.summary}\n`)

  // Build a system prompt with live context
  const systemPrompt = [
    'You are a developer assistant with real-time awareness of the user\'s environment.',
    '',
    'CURRENT CONTEXT:',
    context.summary,
    '',
    `Context includes ${context.events.length} relevant events.`,
    `Most recent: ${new Date(context.events[0]?.timestamp).toLocaleTimeString()}`,
  ].join('\n')

  console.log('--- System Prompt ---')
  console.log(systemPrompt)
  console.log('--- End ---\n')

  // If Anthropic SDK is available, make the actual call
  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    const claude = new Anthropic()

    console.log('Asking Claude: "What should I focus on right now?"\n')

    const response = await claude.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      system: systemPrompt,
      messages: [{ role: 'user', content: 'What should I focus on right now?' }],
    })

    console.log('Claude:', response.content[0].text)
  } catch (e) {
    console.log('(Skipping Claude call — set ANTHROPIC_API_KEY to try it live)')
    console.log('The context above is what you\'d pass into any LLM\'s system prompt.')
  }

  await ctx.close()
}

main().catch(console.error)
