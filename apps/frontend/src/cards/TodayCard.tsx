import { Card } from './Card'
import type { CardProps } from './types'

type Dish = {
  name: string
  category?: string | null
  price?: number
  vegetarian?: boolean
  vegan?: boolean
}

type Overview = {
  date?: string
  nextClass?: {
    title: string
    start: string
    end: string
    location?: string
    status?: 'ongoing' | 'upcoming'
  } | null
  restaurant?: {
    name: string
    address?: string
    distanceKm?: number
    openingHours?: string[]
    dishes?: Dish[]
  } | null
  match?: { rule: string; explanation: string }
}

const MAX_DISHES = 6

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Brussels',
  })

const euro = (price: number) => `€${price.toFixed(2)}`

export function TodayCard({ result, isPending }: CardProps) {
  const overview = (result ?? {}) as Overview
  const { nextClass, restaurant, match } = overview
  if (!result) {
    return (
      <Card title="Today at a glance">
        <p>{isPending ? 'Loading…' : 'No data.'}</p>
      </Card>
    )
  }
  const dishes = restaurant?.dishes ?? []
  const warm = dishes.filter(dish => dish.category === 'WARM_BUFFET')
  const shown = (warm.length > 0 ? warm : dishes).slice(0, MAX_DISHES)

  return (
    <Card
      title="Today at a glance"
      subtitle={overview.date}
    >
      <section className="bg-schedule-bg-grey rounded px-2 py-1.5">
        <div className="text-xs font-bold">
          {nextClass?.status === 'ongoing' ? 'Class now' : 'Next class'}
        </div>
        {nextClass ? (
          <>
            <div className="font-bold">{nextClass.title}</div>
            <div className="text-xs">
              {time(nextClass.start)}–{time(nextClass.end)}
              {nextClass.location && ` · 📍 ${nextClass.location}`}
            </div>
          </>
        ) : (
          <p>No class left.</p>
        )}
      </section>

      <section className="mt-2">
        {restaurant ? (
          <>
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-bold">🍽 {restaurant.name}</span>
              <span className="text-xs">
                {restaurant.openingHours?.join(', ')}
              </span>
            </div>
            {match && (
              <div className="text-xs">
                {restaurant.distanceKm !== undefined &&
                  `${restaurant.distanceKm} km · `}
                {match.explanation}
              </div>
            )}
            <ul className="divide-schedule-border-grey mt-1 divide-y">
              {shown.map(dish => (
                <li
                  key={dish.name}
                  className="flex items-center justify-between gap-2 py-1"
                >
                  <span>
                    {dish.name}
                    {dish.vegan ? ' 🌱' : dish.vegetarian ? ' 🥕' : ''}
                  </span>
                  {dish.price !== undefined && (
                    <span className="shrink-0 font-bold">
                      {euro(dish.price)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            {dishes.length > shown.length && (
              <p className="text-xs">+ {dishes.length - shown.length} more</p>
            )}
          </>
        ) : (
          <p>No restaurant is open with a menu that day.</p>
        )}
      </section>
    </Card>
  )
}
