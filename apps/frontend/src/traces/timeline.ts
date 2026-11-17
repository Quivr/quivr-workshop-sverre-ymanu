import type { Trace } from './types'

export type TimelineRow = {
  kind: 'step' | 'tool'
  label: string
  startMs: number
  durationMs: number
  /** Position and width as a percentage of the run, for CSS. */
  leftPct: number
  widthPct: number
  failed: boolean
}

const MIN_WIDTH_PCT = 0.5

/**
 * Rows for a run, ordered by start. Older traces have no start offsets:
 * their tool calls are laid out one after another instead.
 */
export const buildTimeline = (
  trace: Trace
): { totalMs: number; rows: TimelineRow[] } => {
  let cursor = 0
  const raw = [
    ...(trace.steps ?? []).map((step, index) => ({
      kind: 'step' as const,
      label: `LLM step ${index + 1}`,
      startMs: step.startOffsetMs,
      durationMs: step.durationMs,
      failed: false,
    })),
    ...trace.toolCalls.map(call => {
      const startMs = call.startOffsetMs ?? cursor
      cursor = startMs + call.durationMs
      return {
        kind: 'tool' as const,
        label: call.toolName,
        startMs,
        durationMs: call.durationMs,
        failed: call.error !== undefined,
      }
    }),
  ].sort((a, b) => a.startMs - b.startMs)

  const totalMs = Math.max(
    trace.durationMs,
    ...raw.map(row => row.startMs + row.durationMs),
    1
  )
  const rows = raw.map(row => {
    const widthPct = Math.max((row.durationMs / totalMs) * 100, MIN_WIDTH_PCT)
    const leftPct = Math.min((row.startMs / totalMs) * 100, 100 - widthPct)
    return { ...row, leftPct, widthPct }
  })
  return { totalMs, rows }
}
