import { readFileSync } from 'node:fs'

import { config } from 'agent/config'
import { runAgent } from 'agent/run-agent'

import { EVAL_MCP_PORT } from './start-mcp.js'

export type ToolCall = {
  toolName: string
  input: unknown
  output: unknown
  isError: boolean
}
export type AgentResult = { text: string; toolCalls: ToolCall[] }

/** The frozen "now" of the fixtures, so every eval sees the same day. */
export const fixturesNow = (): Date => {
  const meta = JSON.parse(readFileSync(config.fixturesMetaFile, 'utf8')) as {
    recordedAt: string
  }
  return new Date(meta.recordedAt)
}

/** Runs the real agent once on a question and collects what it did. */
export const askAgent = async (
  question: string,
  model: string,
  mcpPort = EVAL_MCP_PORT,
  onlyTools?: string[]
): Promise<AgentResult> => {
  const result: AgentResult = { text: '', toolCalls: [] }
  const parts = runAgent({
    messages: [{ role: 'user', content: question }],
    model,
    onlyTools,
    now: fixturesNow(),
    mcpUrl: `http://localhost:${mcpPort}/mcp`,
  })

  for await (const part of parts) {
    if (part.type === 'text-delta') result.text += part.text
    if (part.type === 'tool-result' || part.type === 'tool-error') {
      const output = part.type === 'tool-result' ? part.output : undefined
      result.toolCalls.push({
        toolName: part.toolName,
        input: part.input,
        output: part.type === 'tool-result' ? output : String(part.error),
        isError:
          part.type === 'tool-error' ||
          (typeof output === 'object' &&
            output !== null &&
            'isError' in output &&
            output.isError === true),
      })
    }
    if (part.type === 'error') throw part.error
  }
  return result
}
