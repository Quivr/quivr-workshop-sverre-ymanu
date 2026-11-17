import { HttpAgent } from '@ag-ui/client'
import { useCallback, useEffect, useRef, useState } from 'react'

import { plainText, type ExplainTarget } from './explain'

export type ExplainState =
  | { status: 'idle' }
  | { status: 'loading'; label: string }
  | { status: 'done'; label: string; text: string }
  | { status: 'error'; label: string; message: string }

const IDLE: ExplainState = { status: 'idle' }

/**
 * Asks the normal chat agent (same endpoint, same tools) to explain something.
 * Every question is its own short thread, so it never mixes with the chat.
 */
export const useExplain = (model: string) => {
  const [state, setState] = useState<ExplainState>(IDLE)
  const agentRef = useRef<HttpAgent | null>(null)

  const cancel = useCallback(() => {
    const agent = agentRef.current
    agentRef.current = null
    agent?.abortRun()
  }, [])

  const dismiss = useCallback(() => {
    cancel()
    setState(IDLE)
  }, [cancel])

  const explain = useCallback(
    async ({ label, prompt }: ExplainTarget) => {
      cancel()
      const agent = new HttpAgent({ url: '/api/agent' })
      agentRef.current = agent
      agent.addMessage({
        id: crypto.randomUUID(),
        role: 'user',
        content: prompt,
      })
      setState({ status: 'loading', label })

      try {
        await agent.runAgent({ forwardedProps: model ? { model } : {} })
        // A newer question (or a dismiss) replaced this one
        if (agentRef.current !== agent) return
        const answer = [...agent.messages]
          .reverse()
          .find(message => message.role === 'assistant' && message.content)
        const text = plainText(
          typeof answer?.content === 'string' ? answer.content : ''
        )
        setState(
          text
            ? { status: 'done', label, text }
            : {
                status: 'error',
                label,
                message: "I couldn't think of an explanation. Try again?",
              }
        )
      } catch (error) {
        if (agentRef.current !== agent) return
        setState({
          status: 'error',
          label,
          message:
            error instanceof Error
              ? error.message
              : 'Something went wrong. Is the agent running?',
        })
      }
    },
    [cancel, model]
  )

  // Stop a request that is still running when the component goes away
  useEffect(() => cancel, [cancel])

  return { state, explain, dismiss }
}
