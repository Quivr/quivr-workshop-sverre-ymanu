import type { Message } from '@ag-ui/core'
import { describe, expect, it } from 'vitest'

import {
  SUGGESTED_QUESTIONS,
  isNearBottom,
  withoutUnansweredToolCalls,
} from './chatHelpers'

const call = (id: string) => ({
  id,
  type: 'function' as const,
  function: { name: 'get_menu', arguments: '{}' },
})

describe('SUGGESTED_QUESTIONS', () => {
  it('offers 4 to 6 distinct questions', () => {
    expect(SUGGESTED_QUESTIONS.length).toBeGreaterThanOrEqual(4)
    expect(SUGGESTED_QUESTIONS.length).toBeLessThanOrEqual(6)
    expect(new Set(SUGGESTED_QUESTIONS).size).toBe(SUGGESTED_QUESTIONS.length)
  })
})

describe('isNearBottom', () => {
  it('is true at the bottom and within the threshold', () => {
    expect(
      isNearBottom({ scrollTop: 600, scrollHeight: 1000, clientHeight: 400 })
    ).toBe(true)
    expect(
      isNearBottom({ scrollTop: 530, scrollHeight: 1000, clientHeight: 400 })
    ).toBe(true)
  })

  it('is false when the user scrolled up', () => {
    expect(
      isNearBottom({ scrollTop: 200, scrollHeight: 1000, clientHeight: 400 })
    ).toBe(false)
  })

  it('is true when the content does not overflow', () => {
    expect(
      isNearBottom({ scrollTop: 0, scrollHeight: 300, clientHeight: 400 })
    ).toBe(true)
  })
})

describe('withoutUnansweredToolCalls', () => {
  it('keeps a complete conversation unchanged', () => {
    const messages: Message[] = [
      { id: '1', role: 'user', content: 'menu?' },
      { id: '2', role: 'assistant', toolCalls: [call('c1')] },
      { id: '3', role: 'tool', toolCallId: 'c1', content: '{}' },
      { id: '4', role: 'assistant', content: 'Pasta.' },
    ]
    expect(withoutUnansweredToolCalls(messages)).toEqual(messages)
  })

  it('drops an unanswered tool call and the empty assistant message', () => {
    const messages: Message[] = [
      { id: '1', role: 'user', content: 'menu?' },
      { id: '2', role: 'assistant', toolCalls: [call('c1')] },
    ]
    expect(withoutUnansweredToolCalls(messages)).toEqual([messages[0]])
  })

  it('keeps the text and the answered calls of a partly answered message', () => {
    const messages: Message[] = [
      {
        id: '2',
        role: 'assistant',
        content: 'Let me check.',
        toolCalls: [call('c1'), call('c2')],
      },
      { id: '3', role: 'tool', toolCallId: 'c1', content: '{}' },
    ]
    expect(withoutUnansweredToolCalls(messages)).toEqual([
      { ...messages[0], toolCalls: [call('c1')] },
      messages[1],
    ])
  })
})
