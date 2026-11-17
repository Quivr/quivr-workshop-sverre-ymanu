import { Card } from './Card'
import type { CardProps } from './types'

type Bar = {
  name?: string
  open?: boolean
  busyness?: string
  description?: string
}

type Bars = { bars?: Bar[] }

function OpenBadge({ open }: { open: boolean }) {
  return (
    <span
      className={`${open ? 'bg-ok-tint text-ok-text' : 'bg-sidenav-secondary text-white'} shrink-0 rounded px-1.5 text-xs`}
    >
      {open ? 'open' : 'closed'}
    </span>
  )
}

export function BarsCard({ result }: CardProps) {
  const bars = ((result as Bars | null)?.bars ?? []).filter(
    (bar): bar is Bar => typeof bar?.name === 'string'
  )
  const openCount = bars.filter(bar => bar.open).length

  return (
    <Card
      title="Student bars"
      subtitle={`${openCount} open now`}
    >
      {bars.length === 0 && <p>No student bars are open right now.</p>}
      <ul className="divide-schedule-border-grey divide-y">
        {bars.map(bar => (
          <li
            key={bar.name}
            className="py-1.5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold">{bar.name}</span>
              <span className="flex items-center gap-2">
                {bar.busyness && (
                  <span className="text-muted text-xs">{bar.busyness}</span>
                )}
                <OpenBadge open={bar.open === true} />
              </span>
            </div>
            {bar.description && (
              <p className="text-muted text-xs">{bar.description}</p>
            )}
          </li>
        ))}
      </ul>
    </Card>
  )
}
