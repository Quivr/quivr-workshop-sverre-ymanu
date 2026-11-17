import type { CardProps } from './types'

const pretty = (value: unknown) =>
  typeof value === 'string' ? value : JSON.stringify(value, null, 2)

/** Fallback card for any tool: name, args, result and duration. */
export function ToolCallCard({
  toolName,
  args,
  result,
  error,
  isPending,
  durationMs,
}: CardProps) {
  const status = isPending ? 'running…' : error ? 'failed' : 'done'
  const duration = durationMs === undefined ? '' : ` · ${durationMs} ms`

  return (
    <details className="border-schedule-border-grey bg-surface rounded-md border text-xs">
      <summary className="cursor-pointer px-3 py-2">
        <span className="font-bold">🔧 {toolName}</span>
        <span className={error ? 'text-danger-text' : 'text-muted'}>
          {' '}
          {status}
          {duration}
        </span>
      </summary>
      <div className="border-schedule-border-grey space-y-2 border-t px-3 py-2">
        <div>
          <div className="font-bold">Arguments</div>
          <pre className="overflow-x-auto whitespace-pre-wrap">
            {pretty(args)}
          </pre>
        </div>
        {!isPending && (
          <div>
            <div className="font-bold">{error ? 'Error' : 'Result'}</div>
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap">
              {pretty(error ?? result)}
            </pre>
          </div>
        )}
      </div>
    </details>
  )
}
