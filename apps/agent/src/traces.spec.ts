import type { ModelMessage } from 'ai'
import { describe, expect, it, vi } from 'vitest'

import { startTrace } from './traces.js'
import type { AgentStreamPart } from './run-agent.js'

const part = (value: object) => value as AgentStreamPart

describe('startTrace', () => {
  it('records LLM steps and tool call offsets', () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
    vi.spyOn(console, 'info').mockImplementation(() => {})
    const { trace, record } = startTrace('test:model', [] as ModelMessage[])

    vi.setSystemTime(10)
    record(part({ type: 'start-step' }))
    vi.setSystemTime(110)
    record(
      part({
        type: 'finish-step',
        finishReason: 'tool-calls',
        usage: { inputTokens: 100, outputTokens: 20 },
      })
    )
    record(part({ type: 'tool-call', toolCallId: 'c1' }))
    vi.setSystemTime(160)
    record(
      part({
        type: 'tool-result',
        toolCallId: 'c1',
        toolName: 'menu',
        input: {},
        output: { content: [{ type: 'text', text: '{}' }] },
      })
    )

    expect(trace.steps).toEqual([
      {
        startOffsetMs: 10,
        durationMs: 100,
        finishReason: 'tool-calls',
        usage: { inputTokens: 100, outputTokens: 20 },
      },
    ])
    expect(trace.toolCalls[0]).toMatchObject({
      startOffsetMs: 110,
      durationMs: 50,
    })
    vi.useRealTimers()
  })
})
