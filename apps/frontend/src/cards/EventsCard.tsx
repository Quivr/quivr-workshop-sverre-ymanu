import { Card } from './Card'
import type { CardProps } from './types'

type Ticket = {
  name?: string
  price?: string
  soldOut?: boolean
}

type CampusEvent = {
  id?: string
  title?: string
  start?: string
  end?: string
  location?: string
  organiser?: string
  description?: string
  tickets?: Ticket[]
  url?: string
}

type Events = {
  total?: number
  events?: CampusEvent[]
}

const formatStart = (iso?: string) => {
  const date = iso ? new Date(iso) : undefined
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : undefined
}

const ticketSummary = (tickets: Ticket[]) =>
  tickets
    .map(
      ticket =>
        `${ticket.name ?? 'Ticket'} ${ticket.price ?? ''}${ticket.soldOut ? ' (sold out)' : ''}`
    )
    .join(' · ')

export function EventsCard({ result }: CardProps) {
  const data = (result ?? {}) as Events
  const events = Array.isArray(data.events) ? data.events : []
  const shown = events.length
  const subtitle =
    typeof data.total === 'number' && data.total > shown
      ? `${shown} of ${data.total}`
      : undefined

  return (
    <Card
      title="Events"
      subtitle={subtitle}
    >
      {events.length === 0 && <p>No upcoming events found.</p>}
      <ul className="divide-schedule-border-grey divide-y">
        {events.map((event, index) => {
          const meta = [formatStart(event.start), event.location]
            .filter(Boolean)
            .join(' · ')
          const tickets = Array.isArray(event.tickets)
            ? ticketSummary(event.tickets)
            : ''
          return (
            <li
              key={event.id ?? `${event.title}-${index}`}
              className="py-1.5"
            >
              {event.url ? (
                <a
                  href={event.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-heading font-bold hover:underline"
                >
                  {event.title ?? 'Untitled'}
                </a>
              ) : (
                <span className="text-heading font-bold">
                  {event.title ?? 'Untitled'}
                </span>
              )}
              {meta && <div className="text-muted text-xs">{meta}</div>}
              {event.organiser && (
                <div className="text-muted text-xs">by {event.organiser}</div>
              )}
              {event.description && <p>{event.description}</p>}
              {tickets && <div className="text-xs font-bold">{tickets}</div>}
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
