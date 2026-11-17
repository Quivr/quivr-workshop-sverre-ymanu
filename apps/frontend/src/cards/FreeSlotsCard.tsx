import { Card } from './Card'
import type { CardProps } from './types'

type FreeSlots = {
  date: string
  participants: string[]
  slots: { start: string; end: string; minutes: number }[]
  sharedNothing: string[]
}

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Brussels',
  })

const duration = (minutes: number) =>
  minutes >= 60
    ? `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ''}`
    : `${minutes}m`

export function FreeSlotsCard({ result }: CardProps) {
  const free = result as FreeSlots

  return (
    <Card
      title="Free together"
      subtitle={`${free.date} · ${free.participants.join(', ')}`}
    >
      {free.slots.length === 0 && <p>No common free time.</p>}
      <ul className="space-y-1.5">
        {free.slots.map(slot => (
          <li
            key={slot.start}
            className="bg-schedule-bg-grey flex justify-between rounded px-2 py-1.5"
          >
            <span className="font-bold">
              {time(slot.start)}–{time(slot.end)}
            </span>
            <span className="text-xs">{duration(slot.minutes)}</span>
          </li>
        ))}
      </ul>
      {free.sharedNothing.length > 0 && (
        <p className="mt-2 text-xs">
          No shared schedule from {free.sharedNothing.join(', ')}.
        </p>
      )}
    </Card>
  )
}
