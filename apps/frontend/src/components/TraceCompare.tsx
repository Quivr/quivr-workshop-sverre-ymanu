import { formatCost } from '../traces/cost'
import { diffTraces, type Metric } from '../traces/diff'
import type { Trace } from '../traces/types'

const row = (
  label: string,
  { a, b, delta }: Metric,
  format: (value: number | undefined) => string = value =>
    value === undefined ? 'n/a' : String(value),
  unit = ''
) => (
  <tr key={label}>
    <td className="py-1 pr-3 font-bold">{label}</td>
    <td className="py-1 pr-3">{format(a)}</td>
    <td className="py-1 pr-3">{format(b)}</td>
    <td className="py-1">
      {delta === undefined || delta === 0
        ? ''
        : `${delta > 0 ? '+' : '−'}${format(Math.abs(delta))}${unit}`}
    </td>
  </tr>
)

const names = (entries: [string, ...number[]][]) =>
  entries.length === 0
    ? '–'
    : entries
        .map(
          ([name, ...counts]) => `${name} ×${[...new Set(counts)].join('→')}`
        )
        .join(', ')

const question = (trace: Trace) => {
  const content = trace.messages.filter(m => m.role === 'user').at(-1)?.content
  return typeof content === 'string' ? content : '(no question)'
}

/** Side by side comparison of two runs: A is the baseline, B the other run. */
export function TraceCompare({ a, b }: { a: Trace; b: Trace }) {
  const diff = diffTraces(a, b)
  const cost = (value: number | undefined) =>
    value === undefined ? 'n/a' : formatCost(value).replace('~', '')

  return (
    <div className="border-main bg-surface space-y-3 rounded-md border-2 p-3 text-sm shadow-sm">
      <div className="font-bold">Comparing two runs</div>
      <table className="text-xs">
        <thead>
          <tr className="text-left">
            <th className="pr-3" />
            <th className="pr-3">A · {a.model}</th>
            <th className="pr-3">B · {b.model}</th>
            <th>Change</th>
          </tr>
        </thead>
        <tbody>
          {row('Duration', diff.durationMs, undefined, ' ms')}
          {row('Input tokens', diff.inputTokens)}
          {row('Output tokens', diff.outputTokens)}
          {row('Est. cost (USD)', diff.costUsd, cost)}
        </tbody>
      </table>
      <div className="space-y-1 text-xs">
        <div className="font-bold">Tools called</div>
        <p className="text-danger-text">
          Only in A: {names(diff.tools.removed)}
        </p>
        <p className="text-ok-text">Only in B: {names(diff.tools.added)}</p>
        <p>In both: {names(diff.tools.same)}</p>
      </div>
      <div>
        <div className="mb-1 text-xs font-bold">
          Final answer {diff.sameAnswer ? '(identical)' : '(different)'}
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          {[a, b].map((trace, index) => (
            <div
              key={trace.id}
              className="bg-schedule-bg-grey rounded p-2"
            >
              <div className="text-muted mb-1 text-xs">
                {index === 0 ? 'A' : 'B'} · {question(trace)}
              </div>
              <p className="text-xs whitespace-pre-wrap">
                {trace.text || '(no answer)'}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
