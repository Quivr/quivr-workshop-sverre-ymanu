import { describe, expect, it } from 'vitest'

import { diffTraces } from './diff'
import { fakeTrace } from './testing'

const call = (toolName: string) => ({
  toolCallId: `${toolName}-id`,
  toolName,
  input: {},
  durationMs: 10,
})

describe('diffTraces', () => {
  it('compares duration, tokens and cost', () => {
    const diff = diffTraces(
      fakeTrace({
        durationMs: 1000,
        usage: { inputTokens: 1000, outputTokens: 100 },
      }),
      fakeTrace({
        durationMs: 1500,
        usage: { inputTokens: 2000, outputTokens: 50 },
      })
    )
    expect(diff.durationMs).toEqual({ a: 1000, b: 1500, delta: 500 })
    expect(diff.inputTokens.delta).toBe(1000)
    expect(diff.outputTokens.delta).toBe(-50)
    expect(diff.costUsd.a).toBeCloseTo(0.0015)
    expect(diff.costUsd.b).toBeCloseTo(0.00225)
  })

  it('leaves deltas empty when usage or model price is unknown', () => {
    const diff = diffTraces(
      fakeTrace({ usage: { inputTokens: 10, outputTokens: 1 } }),
      fakeTrace({ model: 'other:model', usage: { inputTokens: 5 } })
    )
    expect(diff.inputTokens.delta).toBe(-5)
    expect(diff.outputTokens.delta).toBeUndefined()
    expect(diff.costUsd.b).toBeUndefined()
    expect(diff.costUsd.delta).toBeUndefined()
  })

  it('splits tools into removed, added and same', () => {
    const diff = diffTraces(
      fakeTrace({
        toolCalls: [call('menu'), call('menu'), call('opening_hours')],
      }),
      fakeTrace({ toolCalls: [call('menu'), call('events')] })
    )
    expect(diff.tools).toEqual({
      removed: [['opening_hours', 1]],
      added: [['events', 1]],
      same: [['menu', 2, 1]],
    })
  })

  it('detects identical answers ignoring surrounding whitespace', () => {
    expect(
      diffTraces(fakeTrace({ text: 'Pasta. ' }), fakeTrace({ text: 'Pasta.' }))
        .sameAnswer
    ).toBe(true)
    expect(
      diffTraces(fakeTrace({ text: 'Pasta.' }), fakeTrace({ text: 'Soup.' }))
        .sameAnswer
    ).toBe(false)
  })
})
