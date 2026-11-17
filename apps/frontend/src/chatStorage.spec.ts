import type { Message } from '@ag-ui/core'
import { describe, expect, it } from 'vitest'

import {
  MAX_STORED_BYTES,
  MAX_STORED_MESSAGES,
  STORAGE_KEY,
  STORAGE_VERSION,
  loadChat,
  restoreChat,
  saveChat,
  serialiseChat,
  toMarkdown,
} from './chatStorage'

const call = (id: string, name = 'get_menu') => ({
  id,
  type: 'function' as const,
  function: { name, arguments: '{"date":"2026-01-02"}' },
})

const user = (id: string, content = 'Hello'): Message => ({
  id,
  role: 'user',
  content,
})

const conversation: Message[] = [
  user('u1', 'What is for lunch?'),
  { id: 'a1', role: 'assistant', toolCalls: [call('c1')] },
  { id: 't1', role: 'tool', toolCallId: 'c1', content: '{"raw":"json"}' },
  { id: 'a2', role: 'assistant', content: 'Pasta.' },
]

const memoryStorage = (initial: Record<string, string> = {}) => {
  const data = new Map(Object.entries(initial))
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  }
}

describe('serialiseChat / restoreChat', () => {
  it('round-trips messages and model', () => {
    const json = serialiseChat(conversation, 'model-a')
    expect(restoreChat(json)).toEqual({
      messages: conversation,
      model: 'model-a',
    })
  })

  it('stores nothing for an empty chat without a model', () => {
    expect(serialiseChat([], '')).toBeNull()
  })

  it('keeps the model for an empty chat', () => {
    expect(restoreChat(serialiseChat([], 'model-a'))).toEqual({
      messages: [],
      model: 'model-a',
    })
  })

  it('drops unanswered tool calls when saving', () => {
    const streaming: Message[] = [
      ...conversation,
      user('u2', 'And dinner?'),
      { id: 'a3', role: 'assistant', toolCalls: [call('c2')] },
    ]
    const restored = restoreChat(serialiseChat(streaming, 'm'))
    expect(restored.messages.map(message => message.id)).toEqual([
      'u1',
      'a1',
      't1',
      'a2',
      'u2',
    ])
  })

  it('drops unanswered tool calls when restoring', () => {
    const raw = JSON.stringify({
      version: STORAGE_VERSION,
      model: 'm',
      messages: [
        user('u1'),
        { id: 'a1', role: 'assistant', toolCalls: [call('c1')] },
      ],
    })
    expect(restoreChat(raw).messages).toEqual([user('u1')])
  })

  it('keeps only the last messages, starting at a user message', () => {
    const many: Message[] = Array.from(
      { length: MAX_STORED_MESSAGES },
      (_, index) => user(`u${index}`)
    )
    const restored = restoreChat(
      serialiseChat([...many, ...conversation], 'm')
    ).messages
    expect(restored.length).toBeLessThanOrEqual(MAX_STORED_MESSAGES)
    expect(restored[0]?.role).toBe('user')
    expect(restored.at(-1)?.id).toBe('a2')
  })

  it('drops the oldest messages when over the size cap', () => {
    const big = 'x'.repeat(MAX_STORED_BYTES / 4)
    const messages = Array.from({ length: 8 }, (_, index) =>
      user(`u${index}`, big)
    )
    const json = serialiseChat(messages, 'm')
    expect(json).not.toBeNull()
    expect(json!.length).toBeLessThanOrEqual(MAX_STORED_BYTES)
    const restored = restoreChat(json).messages
    expect(restored.length).toBeGreaterThan(0)
    expect(restored.at(-1)?.id).toBe('u7')
  })

  it('ignores a single message above the size cap', () => {
    const huge = [user('u1', 'x'.repeat(MAX_STORED_BYTES + 1))]
    expect(serialiseChat(huge, '')).toBeNull()
  })
})

describe('restoreChat with bad data', () => {
  const empty = { messages: [], model: '' }

  it('ignores null, empty and corrupt JSON', () => {
    expect(restoreChat(null)).toEqual(empty)
    expect(restoreChat('')).toEqual(empty)
    expect(restoreChat('{not json')).toEqual(empty)
    expect(restoreChat('[1,2]')).toEqual(empty)
    expect(restoreChat('null')).toEqual(empty)
  })

  it('ignores another version', () => {
    const raw = JSON.stringify({
      version: 0,
      model: 'm',
      messages: [user('u1')],
    })
    expect(restoreChat(raw)).toEqual(empty)
  })

  it('ignores stored data above the size cap', () => {
    expect(restoreChat(' '.repeat(MAX_STORED_BYTES + 1))).toEqual(empty)
  })

  it('ignores messages with an unexpected shape', () => {
    const raw = JSON.stringify({
      version: STORAGE_VERSION,
      model: 'm',
      messages: [user('u1'), { id: 'x', role: 'assistant', toolCalls: 'nope' }],
    })
    expect(restoreChat(raw)).toEqual({ messages: [], model: 'm' })
    const unknownRole = JSON.stringify({
      version: STORAGE_VERSION,
      messages: [{ id: 'x', role: 'wizard', content: 'hi' }],
    })
    expect(restoreChat(unknownRole)).toEqual(empty)
  })
})

describe('loadChat / saveChat', () => {
  it('saves and loads through storage', () => {
    const storage = memoryStorage()
    saveChat(conversation, 'm', storage)
    expect(loadChat(storage)).toEqual({ messages: conversation, model: 'm' })
  })

  it('removes the stored chat when there is nothing to keep', () => {
    const storage = memoryStorage({ [STORAGE_KEY]: 'old' })
    saveChat([], '', storage)
    expect(storage.data.has(STORAGE_KEY)).toBe(false)
  })

  it('never throws when storage fails or is missing', () => {
    const broken = {
      getItem: () => {
        throw new Error('denied')
      },
      setItem: () => {
        throw new Error('quota')
      },
      removeItem: () => {
        throw new Error('denied')
      },
    }
    expect(() => saveChat(conversation, 'm', broken)).not.toThrow()
    expect(loadChat(broken)).toEqual({ messages: [], model: '' })
    expect(() => saveChat(conversation, 'm', undefined)).not.toThrow()
  })
})

describe('toMarkdown', () => {
  it('renders questions, answers and tool names without raw tool JSON', () => {
    const markdown = toMarkdown(conversation)
    expect(markdown).toBe(
      [
        '### You\n\nWhat is for lunch?',
        '### Ask Quivr\n\n_Tools used: get_menu_',
        '### Ask Quivr\n\nPasta.',
      ].join('\n\n')
    )
    expect(markdown).not.toContain('raw')
    expect(markdown).not.toContain('2026-01-02')
  })

  it('lists each tool once and keeps text with its tools', () => {
    const markdown = toMarkdown([
      user('u1'),
      {
        id: 'a1',
        role: 'assistant',
        content: 'Done.',
        toolCalls: [call('c1'), call('c2'), call('c3', 'list_libraries')],
      },
    ])
    expect(markdown).toContain(
      '_Tools used: get_menu, list_libraries_\n\nDone.'
    )
  })

  it('is empty for an empty chat', () => {
    expect(toMarkdown([])).toBe('')
  })
})
