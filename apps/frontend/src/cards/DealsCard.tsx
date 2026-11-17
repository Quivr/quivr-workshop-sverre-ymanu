import { Card } from './Card'
import type { CardProps } from './types'

type Deal = {
  partner?: string
  title?: string
  details?: string
  validUntil?: string
  url?: string
}

type Deals = {
  query?: string
  deals?: Deal[]
  total?: number
}

const formatDate = (iso?: string) => {
  const date = iso ? new Date(iso) : undefined
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : undefined
}

const safeUrl = (url?: string) =>
  typeof url === 'string' && /^https?:\/\//i.test(url) ? url : undefined

export function DealsCard({ result }: CardProps) {
  const data = (result ?? {}) as Deals
  const deals = (Array.isArray(data.deals) ? data.deals : []).filter(
    (deal): deal is Deal => typeof deal === 'object' && deal !== null
  )

  return (
    <Card
      title="Student deals"
      subtitle={data.query}
    >
      {deals.length === 0 && <p className="text-muted">No deals found.</p>}
      <ul className="divide-schedule-border-grey divide-y">
        {deals.map((deal, index) => {
          const url = safeUrl(deal.url)
          const until = formatDate(deal.validUntil)
          return (
            <li
              key={`${deal.partner}-${deal.title}-${index}`}
              className="py-1.5"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-heading font-bold">
                  {deal.partner ?? 'Partner'}
                </span>
                {until && (
                  <span className="text-muted shrink-0 text-xs">
                    until {until}
                  </span>
                )}
              </div>
              {deal.title && <p className="font-bold">{deal.title}</p>}
              {deal.details && <p className="text-muted">{deal.details}</p>}
              {url && (
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs hover:underline"
                >
                  More info
                </a>
              )}
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
