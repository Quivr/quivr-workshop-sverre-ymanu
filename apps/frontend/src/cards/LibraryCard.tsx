import { Card } from './Card'
import {
  freeSeats,
  levelFor,
  parseLibraries,
  sortLeastBusy,
  type Library,
  type Level,
} from './library-occupancy'
import type { CardProps } from './types'

const barColour: Record<Level, string> = {
  low: 'bg-green-status',
  medium: 'bg-main',
  high: 'bg-danger',
}

const time = (iso: string) => {
  const date = new Date(iso)
  return Number.isNaN(date.getTime())
    ? undefined
    : date.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Brussels',
      })
}

function LibraryRow({ library }: { library: Library }) {
  const { percentFull } = library
  const free = freeSeats(library)
  const measured = library.measuredAt && time(library.measuredAt)

  return (
    <li className="py-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-bold">{library.name}</span>
        {percentFull === undefined ? (
          <span className="text-xs italic">no live data</span>
        ) : (
          <span className="shrink-0 font-bold">{percentFull}%</span>
        )}
      </div>
      {percentFull !== undefined && (
        <div
          role="progressbar"
          aria-label={`${library.name} occupancy`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.min(percentFull, 100)}
          className="bg-schedule-bg-grey mt-1 h-2 overflow-hidden rounded-full"
        >
          <div
            className={`h-full ${barColour[levelFor(percentFull)]}`}
            style={{ width: `${Math.min(Math.max(percentFull, 0), 100)}%` }}
          />
        </div>
      )}
      {(free !== undefined || measured) && (
        <div className="mt-0.5 flex justify-between text-xs">
          <span>{free !== undefined && `${free} seats free`}</span>
          {measured && <span>measured {measured}</span>}
        </div>
      )}
    </li>
  )
}

export function LibraryCard({ result }: CardProps) {
  const libraries = sortLeastBusy(parseLibraries(result))

  return (
    <Card
      title="Libraries"
      subtitle="least busy first"
    >
      {libraries.length === 0 && <p>No library data.</p>}
      <ul className="divide-schedule-border-grey divide-y">
        {libraries.map(library => (
          <LibraryRow
            key={library.name}
            library={library}
          />
        ))}
      </ul>
    </Card>
  )
}
