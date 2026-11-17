import type { Message } from '@ag-ui/core'

import { withoutUnansweredToolCalls } from './chatHelpers'

export const STORAGE_KEY = 'ask-quivr-chat'
export const STORAGE_VERSION = 1
export const MAX_STORED_MESSAGES = 200
export const MAX_STORED_BYTES = 1_000_000

export type SavedChat = { messages: Message[]; model: string }

type ChatStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isToolCall = (value: unknown) =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  isRecord(value.function) &&
  typeof value.function.name === 'string' &&
  typeof value.function.arguments === 'string'

/** Only the shapes the UI renders: user, assistant (text + tool calls) and tool messages. */
const isStorableMessage = (value: unknown): value is Message => {
  if (!isRecord(value) || typeof value.id !== 'string') return false
  switch (value.role) {
    case 'user':
      return typeof value.content === 'string'
    case 'assistant':
      return (
        (value.content === undefined || typeof value.content === 'string') &&
        (value.toolCalls === undefined ||
          (Array.isArray(value.toolCalls) && value.toolCalls.every(isToolCall)))
      )
    case 'tool':
      return (
        typeof value.toolCallId === 'string' &&
        typeof value.content === 'string'
      )
    default:
      return false
  }
}

/** Drops messages before the first user message, so a cut never leaves orphan tool results. */
const startingAtUserMessage = (messages: Message[]) => {
  const first = messages.findIndex(message => message.role === 'user')
  return first === -1 ? [] : messages.slice(first)
}

const cleaned = (messages: Message[]) =>
  startingAtUserMessage(withoutUnansweredToolCalls(messages)).slice(
    -MAX_STORED_MESSAGES
  )

const payload = (messages: Message[], model: string) =>
  JSON.stringify({ version: STORAGE_VERSION, model, messages })

/**
 * The JSON to store, or null when there is nothing worth storing. Unanswered
 * tool calls are dropped, then the oldest messages until it fits the caps.
 */
export const serialiseChat = (
  messages: Message[],
  model: string
): string | null => {
  let kept = cleaned(messages)
  let json = payload(kept, model)
  while (json.length > MAX_STORED_BYTES && kept.length > 0) {
    kept = startingAtUserMessage(kept.slice(Math.ceil(kept.length / 4)))
    json = payload(kept, model)
  }
  if (json.length > MAX_STORED_BYTES) return null
  return kept.length === 0 && !model ? null : json
}

/** Parses stored JSON. Anything corrupt, oversized or from another version gives an empty chat. */
export const restoreChat = (raw: string | null): SavedChat => {
  const empty: SavedChat = { messages: [], model: '' }
  if (!raw || raw.length > MAX_STORED_BYTES) return empty
  try {
    const data: unknown = JSON.parse(raw)
    if (!isRecord(data) || data.version !== STORAGE_VERSION) return empty
    const model = typeof data.model === 'string' ? data.model : ''
    if (!Array.isArray(data.messages)) return { messages: [], model }
    if (!data.messages.every(isStorableMessage)) return { messages: [], model }
    return { messages: cleaned(data.messages), model }
  } catch {
    return empty
  }
}

const defaultStorage = (): ChatStorage | undefined => {
  try {
    return globalThis.localStorage
  } catch {
    return undefined
  }
}

export const loadChat = (storage = defaultStorage()): SavedChat => {
  try {
    return restoreChat(storage?.getItem(STORAGE_KEY) ?? null)
  } catch {
    return { messages: [], model: '' }
  }
}

/** Never throws: storage can be unavailable (private mode) or full. */
export const saveChat = (
  messages: Message[],
  model: string,
  storage = defaultStorage()
) => {
  try {
    const json = serialiseChat(messages, model)
    if (json) storage?.setItem(STORAGE_KEY, json)
    else storage?.removeItem(STORAGE_KEY)
  } catch {
    // ignore: persistence is best effort
  }
}

const contentOf = (message: Message) =>
  'content' in message && typeof message.content === 'string'
    ? message.content.trim()
    : ''

/** The conversation as readable Markdown: questions and answers, tools as one-line mentions. */
export const toMarkdown = (messages: Message[]): string =>
  messages
    .flatMap((message): string[] => {
      if (message.role === 'user') return [`### You\n\n${contentOf(message)}`]
      if (message.role !== 'assistant') return []
      const tools = [
        ...new Set(message.toolCalls?.map(call => call.function.name)),
      ]
      const parts = [
        tools.length > 0 ? `_Tools used: ${tools.join(', ')}_` : '',
        contentOf(message),
      ].filter(Boolean)
      return parts.length > 0 ? [`### Ask Quivr\n\n${parts.join('\n\n')}`] : []
    })
    .join('\n\n')
