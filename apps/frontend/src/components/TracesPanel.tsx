import { useEffect, useState } from 'react'

import { ToolCallCard } from '../cards/ToolCallCard'
import { estimateCost, formatCost } from '../traces/cost'
import type { Trace } from '../traces/types'
import { TraceCompare } from './TraceCompare'
import { TraceTimeline } from './TraceTimeline'

const lastQuestion = (trace: Trace) => {
  const content = trace.messages.filter(m => m.role === 'user').at(-1)?.content
  return typeof content === 'string' ? content : '(no question)'
}

const parse = (text: string | undefined) => {
  try {
    return text === undefined ? undefined : (JSON.parse(text) as unknown)
  } catch {
    return text
  }
}

/** Recent agent runs from .traces/, newest first. */
export function TracesPanel() {
  const [traces, setTraces] = useState<Trace[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<string[]>([])

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/traces', { signal: controller.signal })
      .then(response => response.json() as Promise<{ traces: Trace[] }>)
      .then(body => setTraces(body.traces))
      .catch((fetchError: unknown) => {
        if (!controller.signal.aborted) setError(String(fetchError))
      })
    return () => controller.abort()
  }, [])

  if (error)
    return <p className="text-danger">Could not load traces: {error}</p>
  if (!traces) return <p>Loading traces…</p>
  if (traces.length === 0)
    return <p>No runs yet. Ask something in the chat first.</p>

  const toggleSelected = (id: string) =>
    setSelected(current =>
      current.includes(id)
        ? current.filter(other => other !== id)
        : [...current, id].slice(-2)
    )
  const [a, b] = selected.map(id => traces.find(trace => trace.id === id))

  return (
    <div className="space-y-2">
      <p className="text-sidenav-secondary text-xs">
        Tick two runs to compare them. Costs are estimates from a small price
        table.
      </p>
      {a && b && (
        <TraceCompare
          a={a}
          b={b}
        />
      )}
      {traces.map(trace => (
        <details
          key={trace.id}
          className="bg-surface rounded-md shadow-sm"
        >
          <summary className="cursor-pointer px-3 py-2 text-sm">
            <input
              type="checkbox"
              className="mr-2 align-middle"
              aria-label="Select for comparison"
              checked={selected.includes(trace.id)}
              onClick={event => event.stopPropagation()}
              onChange={() => toggleSelected(trace.id)}
            />
            <span className="font-bold">{lastQuestion(trace)}</span>
            <span className={trace.error ? 'text-danger' : 'text-muted'}>
              {' '}
              · {new Date(trace.startedAt).toLocaleTimeString()} · {trace.model}{' '}
              · {trace.toolCalls.length} tools · {trace.durationMs} ms
              {trace.usage &&
                ` · ${trace.usage.inputTokens ?? 0}→${trace.usage.outputTokens ?? 0} tokens · ${formatCost(estimateCost(trace.model, trace.usage))}`}
            </span>
          </summary>
          <div className="border-schedule-border-grey space-y-2 border-t p-3">
            <TraceTimeline trace={trace} />
            {trace.toolCalls.map(call => (
              <ToolCallCard
                key={call.toolCallId}
                toolName={call.toolName}
                args={call.input}
                result={parse(call.output)}
                error={call.error}
                isPending={false}
                durationMs={call.durationMs}
              />
            ))}
            {trace.error && (
              <p className="text-danger text-sm">Error: {trace.error}</p>
            )}
            <p className="text-sm whitespace-pre-wrap">{trace.text}</p>
          </div>
        </details>
      ))}
    </div>
  )
}
