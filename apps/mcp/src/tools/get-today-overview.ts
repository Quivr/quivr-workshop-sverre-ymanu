import { z } from 'zod'

import { dayRange } from '../quivr/dates.js'
import { dateSchema, defineTool } from './define-tool.js'
import { closestRestaurant, pickNextClass, type Place } from './today-logic.js'

const RULES = {
  distance: 'straight-line distance between the class and the restaurant',
  address:
    'same street (or else same postcode) as the class location; no coordinates were available',
  'first-open':
    'no class (or no usable class location) to compare with, so the first restaurant that is open with a menu',
}

const hhmm = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Brussels',
  }).format(new Date(iso))

export const getTodayOverview = defineTool({
  name: 'get_today_overview',
  description:
    "One-call overview of a day: the student's classes and events that day with the next class highlighted, plus the menu of the open student restaurant closest to that class (computed in code from coordinates or addresses; `match.rule` says which rule was used). Pass `time` (HH:MM, Brussels, from the current time in the system prompt) when the day is today, so classes that already ended are skipped. Dishes are compact (no allergens): use get_menu for those. Use this for questions like 'what's my day like and where can I eat nearby?'. If there is no class left, `nextClass` is null and the menu is from the first open restaurant.",
  inputSchema: {
    date: dateSchema.describe('Day, YYYY-MM-DD'),
    time: z
      .string()
      .regex(/^\d{2}:\d{2}$/, 'Use the HH:MM format')
      .optional()
      .describe(
        'Current time on that day, HH:MM (Brussels). Omit for a future day.'
      ),
  },
  run: async ({ date, time }, quivr) => {
    const after = time
      ? new Date(`${date}T${time}:00${dayRange(date).startTime.slice(-6)}`)
      : null

    const [{ scheduleItems }, { restaurants }] = await Promise.all([
      quivr.getMySchedule(date),
      quivr.listRestaurants(),
    ])

    const items = scheduleItems.scheduleItems
      .map(item => ({
        kind:
          item.__typename === 'Lesson'
            ? ('class' as const)
            : ('event' as const),
        title: item.title,
        start: item.startTime,
        end: item.endTime,
        place: item.locations?.[0] as Place | undefined,
      }))
      .sort((a, b) => a.start.localeCompare(b.start))
    const next = pickNextClass(items, after)

    const menus = await Promise.allSettled(
      restaurants.map(async restaurant => {
        const { restaurants: found } = await quivr.getMenu(restaurant.id, date)
        return { restaurant, menu: found[0] }
      })
    )
    const open = menus.flatMap(result => {
      if (result.status !== 'fulfilled') return []
      const { restaurant, menu } = result.value
      const slots = menu?.openingHours.flatMap(day => day.data) ?? []
      if (!menu || slots.length === 0 || menu.dishes.length === 0) return []
      return [
        {
          id: restaurant.id,
          name: restaurant.name,
          place: restaurant.location,
          menu,
          slots,
        },
      ]
    })
    const match = closestRestaurant(next?.item.place, open)

    return {
      date,
      schedule: items.map(item => ({
        kind: item.kind,
        title: item.title,
        start: item.start,
        end: item.end,
        location: item.place?.name ?? item.place?.address ?? undefined,
        next: item === next?.item || undefined,
      })),
      nextClass: next && {
        title: next.item.title,
        start: next.item.start,
        end: next.item.end,
        location: next.item.place?.name ?? next.item.place?.address,
        status: next.status,
      },
      restaurant: match && {
        name: match.restaurant.name,
        address: match.restaurant.place?.address,
        distanceKm: match.distanceKm,
        openingHours: match.restaurant.slots.map(
          slot => `${hhmm(slot.openFrom)}-${hhmm(slot.openUntil)}`
        ),
        dishes: match.restaurant.menu.dishes.map(dish => ({
          name: dish.name.trim().replace(/[.,;]+$/, ''),
          category: dish.mealCategory,
          price: dish.prices[0],
          vegetarian: dish.vegetarian || dish.vegan,
          vegan: dish.vegan,
        })),
      },
      match: match
        ? { rule: match.rule, explanation: RULES[match.rule] }
        : {
            rule: 'none',
            explanation: 'No restaurant is open with a menu that day',
          },
    }
  },
})
