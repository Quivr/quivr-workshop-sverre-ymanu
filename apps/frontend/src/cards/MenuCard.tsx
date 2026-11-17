import { Card } from './Card'
import type { CardProps } from './types'

type Dish = {
  name: string
  category: string | null
  prices: number[]
  vegetarian: boolean
  vegan: boolean
}

type Menu = {
  restaurant: string
  date: string
  openingHours: string[]
  dishes: Dish[]
}

const euro = (price: number) => `€${price.toFixed(2)}`

function DietBadge({ dish }: { dish: Dish }) {
  if (dish.vegan) {
    return (
      <span className="bg-vegan rounded px-1.5 text-xs text-white">vegan</span>
    )
  }
  if (dish.vegetarian) {
    return (
      <span className="bg-ok-tint text-ok-text rounded px-1.5 text-xs">
        veggie
      </span>
    )
  }
  return null
}

export function MenuCard({ result }: CardProps) {
  const menu = result as Menu
  const hours = menu.openingHours.join(', ') || 'closed'

  return (
    <Card
      title={menu.restaurant}
      subtitle={`${menu.date} · ${hours}`}
    >
      {menu.dishes.length === 0 && <p>No dishes on the menu.</p>}
      <ul className="divide-schedule-border-grey divide-y">
        {menu.dishes.map(dish => (
          <li
            key={dish.name}
            className="flex items-center justify-between gap-2 py-1.5"
          >
            <span className="flex items-center gap-2">
              {dish.name}
              <DietBadge dish={dish} />
            </span>
            {dish.prices[0] !== undefined && (
              <span className="shrink-0 font-bold">{euro(dish.prices[0])}</span>
            )}
          </li>
        ))}
      </ul>
    </Card>
  )
}
