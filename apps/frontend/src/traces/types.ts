export type Usage = { inputTokens?: number; outputTokens?: number }

export type ToolCall = {
  toolCallId: string
  toolName: string
  input: unknown
  output?: string
  error?: string
  startOffsetMs?: number
  durationMs: number
}

export type Step = {
  startOffsetMs: number
  durationMs: number
  finishReason?: string
  usage?: Usage
}

/** A run as served by GET /api/traces. `steps` and `startOffsetMs` are missing in older traces. */
export type Trace = {
  id: string
  startedAt: string
  model: string
  messages: { role: string; content: unknown }[]
  toolCalls: ToolCall[]
  steps?: Step[]
  text: string
  error?: string
  usage?: Usage
  durationMs: number
}
