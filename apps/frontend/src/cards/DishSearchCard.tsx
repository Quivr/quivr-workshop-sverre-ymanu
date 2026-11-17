import { Card } from './Card'
import type { CardProps } from './types'

type Match = {
  date: string
  restaurant: string
  dish: string
  vegetarian: boolean
  vegan: boolean
  price?: number
}

type Search = {
  query: string
  from: string
  to: string
  totalMatches: number
  matches: Match[]
}

const euro = (price: number) => `€${price.toFixed(2)}`

export function DishSearchCard({ result }: CardProps) {
  const search = result as Search

  return (
    <Card
      title={`“${search.query}”`}
      subtitle={`${search.from} → ${search.to} · ${search.totalMatches} found`}
    >
      {search.matches.length === 0 && <p>No dish found.</p>}
      <ul className="divide-schedule-border-grey divide-y">
        {search.matches.map(match => (
          <li
            key={`${match.date}-${match.restaurant}-${match.dish}`}
            className="flex items-center justify-between gap-2 py-1.5"
          >
            <span>
              <span className="font-bold">{match.dish}</span>
              {match.vegan ? ' 🌱' : match.vegetarian ? ' 🥕' : ''}
              <br />
              <span className="text-muted text-xs">
                {match.date} · {match.restaurant}
              </span>
            </span>
            {match.price !== undefined && (
              <span className="shrink-0 font-bold">{euro(match.price)}</span>
            )}
          </li>
        ))}
      </ul>
    </Card>
  )
}
