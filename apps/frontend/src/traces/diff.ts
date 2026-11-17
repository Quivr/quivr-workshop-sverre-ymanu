import { estimateCost } from './cost'
import type { Trace } from './types'

export type Metric = { a?: number; b?: number; delta?: number }

export type TraceDiff = {
  durationMs: Metric
  inputTokens: Metric
  outputTokens: Metric
  costUsd: Metric
  /** Tool names with how many times they were called. */
  tools: {
    removed: [string, number][]
    added: [string, number][]
    /** Called in both runs: name, calls in a, calls in b. */
    same: [string, number, number][]
  }
  sameAnswer: boolean
}

const metric = (a?: number, b?: number): Metric => ({
  a,
  b,
  delta: a === undefined || b === undefined ? undefined : b - a,
})

const countTools = (trace: Trace) => {
  const counts = new Map<string, number>()
  for (const call of trace.toolCalls)
    counts.set(call.toolName, (counts.get(call.toolName) ?? 0) + 1)
  return counts
}

/** Compares run `a` (baseline) with run `b`. */
export const diffTraces = (a: Trace, b: Trace): TraceDiff => {
  const toolsA = countTools(a)
  const toolsB = countTools(b)
  const names = [...new Set([...toolsA.keys(), ...toolsB.keys()])].sort()
  const tools: TraceDiff['tools'] = { removed: [], added: [], same: [] }
  for (const name of names) {
    const inA = toolsA.get(name)
    const inB = toolsB.get(name)
    if (inA && inB) tools.same.push([name, inA, inB])
    else if (inA) tools.removed.push([name, inA])
    else if (inB) tools.added.push([name, inB])
  }
  return {
    durationMs: metric(a.durationMs, b.durationMs),
    inputTokens: metric(a.usage?.inputTokens, b.usage?.inputTokens),
    outputTokens: metric(a.usage?.outputTokens, b.usage?.outputTokens),
    costUsd: metric(
      estimateCost(a.model, a.usage),
      estimateCost(b.model, b.usage)
    ),
    tools,
    sameAnswer: a.text.trim() === b.text.trim(),
  }
}
