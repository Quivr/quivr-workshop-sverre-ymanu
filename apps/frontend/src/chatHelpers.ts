import type { Message } from '@ag-ui/core'

export const SUGGESTED_QUESTIONS = [
  "What's for lunch at the student restaurants today?",
  "What's vegetarian at the student restaurants tomorrow?",
  'Which library is least busy right now?',
  'What classes do I have tomorrow?',
  'Where is my next class?',
  'Which student restaurants are there, and where?',
]

type ScrollMetrics = {
  scrollTop: number
  scrollHeight: number
  clientHeight: number
}

/** True when the user is at (or within `threshold` px of) the bottom of a scroll container. */
export const isNearBottom = (
  { scrollTop, scrollHeight, clientHeight }: ScrollMetrics,
  threshold = 80
) => scrollHeight - scrollTop - clientHeight <= threshold

/**
 * A stopped run can leave an assistant message whose tool calls never got a
 * result. The model API rejects that history, so drop the unanswered calls
 * (and assistant messages left empty by it).
 */
export const withoutUnansweredToolCalls = (messages: Message[]): Message[] => {
  const answered = new Set(
    messages.flatMap(message =>
      message.role === 'tool' ? [message.toolCallId] : []
    )
  )
  return messages.flatMap((message): Message[] => {
    if (message.role !== 'assistant' || !message.toolCalls?.length)
      return [message]
    const toolCalls = message.toolCalls.filter(call => answered.has(call.id))
    if (toolCalls.length === message.toolCalls.length) return [message]
    if (toolCalls.length === 0 && !message.content) return []
    return [{ ...message, toolCalls }]
  })
}
