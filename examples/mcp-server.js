/**
 * MCP Server Example: context-engine-ai as a Model Context Protocol server
 *
 * Exposes context-engine as an MCP tool server — compatible with
 * Claude Desktop, Cursor, Windsurf, VS Code, and any MCP client.
 *
 * Setup:
 *   npm install @modelcontextprotocol/sdk zod
 *   node examples/mcp-server.js
 *
 * Configure in Claude Desktop (edit ~/Library/Application Support/Claude/claude_desktop_config.json):
 *   {
 *     "mcpServers": {
 *       "context-engine": {
 *         "command": "node",
 *         "args": ["/absolute/path/to/examples/mcp-server.js"]
 *       }
 *     }
 *   }
 *
 * Tools exposed to the LLM:
 *   - ingest_event   — Store an event (user actions, messages, alerts, any activity)
 *   - query_context  — Semantic search: "what is the user working on?"
 *   - get_recent     — Latest N events by timestamp
 *   - clear_context  — Wipe all stored events
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { ContextEngine } from 'context-engine-ai'

const ctx = new ContextEngine({
  dbPath: './mcp-context.db',
  maxEvents: 1000,
  decayHours: 24,
})

const server = new McpServer({
  name: 'context-engine',
  version: '1.0.0',
})

// Ingest an event into context storage
server.tool(
  'ingest_event',
  'Store an event in the context engine. Records user actions, system events, messages, or any activity you want the agent to remember and query later.',
  {
    type: z.string().describe('Event category, e.g. "message", "task", "error", "app_switch", "commit"'),
    data: z.record(z.unknown()).describe('Event payload as key-value pairs'),
  },
  async ({ type, data }) => {
    const event = await ctx.ingest({ type, data })
    const count = await ctx.count()
    return {
      content: [{
        type: 'text',
        text: `Stored [${event.type}] ${JSON.stringify(event.data)} — ${count} event(s) total`,
      }],
    }
  }
)

// Semantic query across stored events
server.tool(
  'query_context',
  'Semantic search across all stored events, ranked by relevance to your query and weighted by recency. Returns a summary ready to inject into a system prompt.',
  {
    query: z.string().describe('Natural language query, e.g. "what is the user working on?", "any errors?"'),
    limit: z.number().optional().default(5).describe('Max results to return (default: 5)'),
  },
  async ({ query, limit }) => {
    const result = await ctx.query(query, limit)
    if (result.events.length === 0) {
      return { content: [{ type: 'text', text: 'No relevant events found.' }] }
    }
    const lines = [
      `Query: "${query}"`,
      `Matches: ${result.events.length}`,
      '',
      result.summary,
    ]
    return { content: [{ type: 'text', text: lines.join('\n') }] }
  }
)

// Get recent events by timestamp
server.tool(
  'get_recent',
  'Get the most recent events in reverse chronological order.',
  {
    limit: z.number().optional().default(10).describe('Number of events to return (default: 10)'),
  },
  async ({ limit }) => {
    const events = await ctx.recent(limit)
    if (events.length === 0) {
      return { content: [{ type: 'text', text: 'No events stored yet.' }] }
    }
    const lines = events.map(e =>
      `[${new Date(e.timestamp).toLocaleTimeString()}] [${e.type}] ${JSON.stringify(e.data)}`
    )
    return { content: [{ type: 'text', text: lines.join('\n') }] }
  }
)

// Clear all events
server.tool(
  'clear_context',
  'Remove all stored events from the context engine.',
  {},
  async () => {
    await ctx.clear()
    return { content: [{ type: 'text', text: 'Context cleared.' }] }
  }
)

const transport = new StdioServerTransport()
await server.connect(transport)
