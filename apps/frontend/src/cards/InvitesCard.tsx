import { Card } from './Card'
import type { CardProps } from './types'

type Invite = {
  id: string
  event: string
  start: string
  end: string
  location?: string
  invitedBy: string
  accepted: boolean
}

const when = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Brussels',
  })

export function InvitesCard({ result }: CardProps) {
  const invites = (result ?? []) as Invite[]

  return (
    <Card
      title="Event invites"
      subtitle={`${invites.length} invites`}
    >
      {invites.length === 0 && <p>No event invites.</p>}
      <ul className="divide-schedule-border-grey divide-y">
        {invites.map(invite => (
          <li
            key={invite.id}
            className="flex items-start justify-between gap-2 py-1.5"
          >
            <div>
              <div className="text-heading font-bold">{invite.event}</div>
              <div className="text-muted text-xs">
                {when(invite.start)}
                {invite.location && ` · 📍 ${invite.location}`}
              </div>
              <div className="text-muted text-xs">
                Invited by {invite.invitedBy}
              </div>
            </div>
            <span
              className={`shrink-0 rounded px-1.5 text-xs text-white ${invite.accepted ? 'bg-vegan' : 'bg-blue-pretty'}`}
            >
              {invite.accepted ? 'accepted' : 'pending'}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
