import { buildTimeline } from '../traces/timeline'
import type { Trace } from '../traces/types'

/** One bar per LLM step and tool call, positioned by start offset and duration. */
export function TraceTimeline({ trace }: { trace: Trace }) {
  const { totalMs, rows } = buildTimeline(trace)
  if (rows.length === 0) return null

  return (
    <div className="space-y-1 text-xs">
      <div className="text-muted flex justify-between">
        <span className="font-bold">Timeline</span>
        <span>{totalMs} ms</span>
      </div>
      {rows.map((row, index) => (
        <div
          key={index}
          className="flex items-center gap-2"
        >
          <span className="w-32 shrink-0 truncate">
            {row.kind === 'tool' ? '🔧 ' : ''}
            {row.label}
          </span>
          <div className="bg-schedule-bg-grey relative h-3 flex-1 rounded">
            <div
              className={`absolute h-3 rounded ${
                row.failed
                  ? 'bg-danger'
                  : row.kind === 'tool'
                    ? 'bg-ok'
                    : 'bg-blue-pretty'
              }`}
              style={{ left: `${row.leftPct}%`, width: `${row.widthPct}%` }}
              title={`${row.label}: starts at ${row.startMs} ms, takes ${row.durationMs} ms`}
            />
          </div>
          <span className="w-24 shrink-0 text-right">
            +{row.startMs} · {row.durationMs} ms
          </span>
        </div>
      ))}
      {!trace.steps?.length && (
        <p className="text-muted">
          This run was recorded without LLM step timings.
        </p>
      )}
    </div>
  )
}
