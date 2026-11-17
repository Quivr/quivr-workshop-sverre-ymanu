import { Card } from './Card'
import type { CardProps } from './types'

type InviteDraft = {
  status?: string
  draft?: {
    friends?: { id: string; firstName: string }[]
    start?: string
    end?: string
    place?: string
    message?: string
  }
}

const dateTime = (iso?: string) =>
  iso && !Number.isNaN(Date.parse(iso))
    ? new Date(iso).toLocaleString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Brussels',
      })
    : '…'

const time = (iso?: string) =>
  iso && !Number.isNaN(Date.parse(iso))
    ? new Date(iso).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Brussels',
      })
    : '…'

export function InviteDraftCard({ result }: CardProps) {
  const { draft } = (result ?? {}) as InviteDraft
  const friends = draft?.friends ?? []

  return (
    <Card
      title="Invite draft"
      subtitle="Not sent"
    >
      {!draft && <p>No draft.</p>}
      {draft && (
        <dl className="space-y-1.5">
          <div className="flex justify-between gap-2">
            <dt className="opacity-70">To</dt>
            <dd className="font-bold">
              {friends.map(friend => friend.firstName).join(', ') || '…'}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="opacity-70">When</dt>
            <dd className="font-bold">
              {dateTime(draft.start)}–{time(draft.end)}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="opacity-70">Where</dt>
            <dd className="font-bold">{draft.place ?? '…'}</dd>
          </div>
          {draft.message && (
            <p className="bg-schedule-bg-grey rounded px-2 py-1.5 italic">
              {draft.message}
            </p>
          )}
        </dl>
      )}
    </Card>
  )
}
