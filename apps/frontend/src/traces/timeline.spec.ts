import { describe, expect, it } from 'vitest'

import { buildTimeline } from './timeline'
import { fakeTrace } from './testing'

describe('buildTimeline', () => {
  it('positions steps and tool calls by offset and duration', () => {
    const { totalMs, rows } = buildTimeline(
      fakeTrace({
        durationMs: 1000,
        steps: [
          { startOffsetMs: 0, durationMs: 200 },
          { startOffsetMs: 700, durationMs: 300 },
        ],
        toolCalls: [
          {
            toolCallId: 'c1',
            toolName: 'list_restaurants',
            input: {},
            startOffsetMs: 200,
            durationMs: 500,
          },
        ],
      })
    )
    expect(totalMs).toBe(1000)
    expect(rows.map(row => row.label)).toEqual([
      'LLM step 1',
      'list_restaurants',
      'LLM step 2',
    ])
    expect(rows[1]).toMatchObject({ kind: 'tool', leftPct: 20, widthPct: 50 })
    expect(rows[2]).toMatchObject({ leftPct: 70, widthPct: 30 })
  })

  it('lays out old traces without offsets one call after another', () => {
    const { rows } = buildTimeline(
      fakeTrace({
        durationMs: 1000,
        toolCalls: [
          { toolCallId: 'a', toolName: 'one', input: {}, durationMs: 100 },
          {
            toolCallId: 'b',
            toolName: 'two',
            input: {},
            error: 'boom',
            durationMs: 200,
          },
        ],
      })
    )
    expect(rows.map(row => row.startMs)).toEqual([0, 100])
    expect(rows[1]?.failed).toBe(true)
  })

  it('keeps tiny bars visible and inside the run', () => {
    const { rows } = buildTimeline(
      fakeTrace({
        durationMs: 1000,
        toolCalls: [
          {
            toolCallId: 'a',
            toolName: 'quick',
            input: {},
            startOffsetMs: 1000,
            durationMs: 0,
          },
        ],
      })
    )
    expect(rows[0]?.widthPct).toBeGreaterThan(0)
    expect(
      (rows[0]?.leftPct ?? 0) + (rows[0]?.widthPct ?? 0)
    ).toBeLessThanOrEqual(100)
  })

  it('does not divide by zero for an empty run', () => {
    const { totalMs, rows } = buildTimeline(fakeTrace({ durationMs: 0 }))
    expect(totalMs).toBe(1)
    expect(rows).toEqual([])
  })
})
