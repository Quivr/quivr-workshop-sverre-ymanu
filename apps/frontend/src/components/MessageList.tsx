import type { Message } from '@ag-ui/core'

import { ToolCard } from '../cards/ToolCard'
import { Markdown } from './Markdown'

type Props = {
  messages: Message[]
  durations: Record<string, number>
  isRunning: boolean
}

const textOf = (content: unknown) =>
  typeof content === 'string' ? content : ''

export function MessageList({ messages, durations, isRunning }: Props) {
  const toolResults = new Map(
    messages.flatMap(message =>
      message.role === 'tool'
        ? [[message.toolCallId, textOf(message.content)] as const]
        : []
    )
  )

  return (
    <div className="space-y-3">
      {messages.map(message => {
        if (message.role === 'user') {
          return (
            <div
              key={message.id}
              className="bg-main text-sidenav-blue ml-auto max-w-[80%] rounded-lg px-3 py-2 whitespace-pre-wrap"
            >
              {textOf(message.content)}
            </div>
          )
        }
        if (message.role !== 'assistant') return null

        return (
          <div
            key={message.id}
            className="max-w-[90%] space-y-2"
          >
            {message.toolCalls?.map(call => (
              <ToolCard
                key={call.id}
                toolName={call.function.name}
                argsJson={call.function.arguments}
                resultContent={toolResults.get(call.id)}
                durationMs={durations[call.id]}
              />
            ))}
            {message.content && (
              <div className="rounded-lg bg-white px-3 py-2 shadow-sm">
                <Markdown>{message.content}</Markdown>
              </div>
            )}
          </div>
        )
      })}
      {isRunning && <div className="animate-pulse text-sm">Thinking…</div>}
    </div>
  )
}
