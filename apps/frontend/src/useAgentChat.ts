import { HttpAgent, type AgentSubscriber } from '@ag-ui/client'
import type { Message } from '@ag-ui/core'
import { useRef, useState } from 'react'

import { withoutUnansweredToolCalls } from './chatHelpers'

const TOOL_TIMING_EVENT = 'tool_timing'

const newAgent = (initialMessages: Message[] = []) =>
  new HttpAgent({ url: '/api/agent', initialMessages })

/** Chat state on top of an AG-UI HttpAgent, optionally continuing from restored messages. */
export const useAgentChat = (initialMessages: Message[] = []) => {
  const agentRef = useRef(newAgent(initialMessages))
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [durations, setDurations] = useState<Record<string, number>>({})

  const subscriber: AgentSubscriber = {
    onMessagesChanged: ({ messages }) => setMessages([...messages]),
    onCustomEvent: ({ event }) => {
      if (event.name !== TOOL_TIMING_EVENT) return
      const { toolCallId, durationMs } = event.value as {
        toolCallId: string
        durationMs: number
      }
      setDurations(previous => ({ ...previous, [toolCallId]: durationMs }))
    },
    onRunErrorEvent: ({ event }) => setError(event.message),
    onRunFailed: ({ error }) => setError(error.message),
  }

  const send = async (text: string, model: string) => {
    const agent = agentRef.current
    agent.addMessage({ id: crypto.randomUUID(), role: 'user', content: text })
    setMessages([...agent.messages])
    setError(null)
    setIsRunning(true)
    try {
      await agent.runAgent({ forwardedProps: { model } }, subscriber)
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : String(runError))
    } finally {
      if (agentRef.current === agent) {
        agent.messages = withoutUnansweredToolCalls(agent.messages)
        setMessages([...agent.messages])
        setIsRunning(false)
      }
    }
  }

  const stop = () => agentRef.current.abortRun()

  const reset = () => {
    agentRef.current.abortRun()
    agentRef.current = newAgent()
    setMessages([])
    setDurations({})
    setError(null)
    setIsRunning(false)
  }

  return { messages, isRunning, error, durations, send, stop, reset }
}
