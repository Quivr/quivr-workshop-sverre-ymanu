import { randomUUID } from 'node:crypto'
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
} from 'node:fs'
import { join } from 'node:path'

import type { ModelMessage, TextStreamPart, ToolSet } from 'ai'

import { config } from './config.js'
import { isToolError, toolOutputText } from './tool-output.js'

const MAX_LOGGED_ARGS = 120

export type ToolCallTrace = {
  toolCallId: string
  toolName: string
  input: unknown
  output?: string
  error?: string
  /** Milliseconds from the start of the run; missing in older traces. */
  startOffsetMs?: number
  durationMs: number
}

/** One LLM call within a run. Missing in older traces. */
export type StepTrace = {
  startOffsetMs: number
  durationMs: number
  finishReason?: string
  usage?: { inputTokens?: number; outputTokens?: number }
}

export type Trace = {
  id: string
  startedAt: string
  model: string
  messages: ModelMessage[]
  toolCalls: ToolCallTrace[]
  steps?: StepTrace[]
  text: string
  error?: string
  usage?: { inputTokens?: number; outputTokens?: number }
  durationMs: number
}

const logToolCall = (call: ToolCallTrace) => {
  const args = JSON.stringify(call.input).slice(0, MAX_LOGGED_ARGS)
  const outcome = call.error
    ? `error: ${call.error}`
    : `${call.output?.length ?? 0} chars`
  console.info(
    `[tool] ${call.toolName} ${args} → ${outcome} (${call.durationMs} ms)`
  )
}

/** Records one agent run, logs tool calls and appends the run to .traces/. */
export const startTrace = (model: string, messages: ModelMessage[]) => {
  const started = Date.now()
  const toolStarts = new Map<string, number>()
  const trace: Trace = {
    id: randomUUID(),
    startedAt: new Date(started).toISOString(),
    model,
    messages,
    toolCalls: [],
    steps: [],
    text: '',
    durationMs: 0,
  }

  let stepStarted = started

  const record = (part: TextStreamPart<ToolSet>) => {
    if (part.type === 'start-step') stepStarted = Date.now()
    if (part.type === 'finish-step') {
      trace.steps?.push({
        startOffsetMs: stepStarted - started,
        durationMs: Date.now() - stepStarted,
        finishReason: part.finishReason,
        usage: {
          inputTokens: part.usage.inputTokens,
          outputTokens: part.usage.outputTokens,
        },
      })
    }
    if (part.type === 'text-delta') trace.text += part.text
    if (part.type === 'tool-call') toolStarts.set(part.toolCallId, Date.now())
    if (part.type === 'tool-result' || part.type === 'tool-error') {
      const failed = part.type === 'tool-error' || isToolError(part.output)
      const text =
        part.type === 'tool-error'
          ? String(part.error)
          : toolOutputText(part.output)
      const toolStarted = toolStarts.get(part.toolCallId) ?? started
      const call: ToolCallTrace = {
        toolCallId: part.toolCallId,
        toolName: part.toolName,
        input: part.input,
        ...(failed ? { error: text } : { output: text }),
        startOffsetMs: toolStarted - started,
        durationMs: Date.now() - toolStarted,
      }
      trace.toolCalls.push(call)
      logToolCall(call)
    }
    if (part.type === 'finish') {
      trace.usage = {
        inputTokens: part.totalUsage.inputTokens,
        outputTokens: part.totalUsage.outputTokens,
      }
    }
    if (part.type === 'error') trace.error = String(part.error)
  }

  const finish = (error?: unknown): Trace => {
    trace.durationMs = Date.now() - started
    if (error)
      trace.error = error instanceof Error ? error.message : String(error)
    mkdirSync(config.tracesDir, { recursive: true })
    appendFileSync(
      join(config.tracesDir, `${trace.startedAt.slice(0, 10)}.jsonl`),
      `${JSON.stringify(trace)}\n`
    )
    console.info(
      `[run] ${model} · ${trace.toolCalls.length} tool calls · ${trace.durationMs} ms${trace.error ? ` · error: ${trace.error}` : ''}`
    )
    return trace
  }

  return { trace, record, finish }
}

/** Most recent runs first. */
export const readTraces = (limit = 50): Trace[] => {
  if (!existsSync(config.tracesDir)) return []
  return readdirSync(config.tracesDir)
    .filter(file => file.endsWith('.jsonl'))
    .sort()
    .reverse()
    .flatMap(file =>
      readFileSync(join(config.tracesDir, file), 'utf8')
        .trim()
        .split('\n')
        .filter(Boolean)
        .map(line => JSON.parse(line) as Trace)
        .reverse()
    )
    .slice(0, limit)
}
