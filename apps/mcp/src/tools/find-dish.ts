import { z } from 'zod'

import { addDays } from '../quivr/dates.js'
import { dateSchema, defineTool } from './define-tool.js'

const MAX_DAYS = 7
const MAX_MATCHES = 40

const normalise = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

export const findDish = defineTool({
  name: 'find_dish',
  description: `Search the menus of ALL student restaurants over the next days for dishes whose name contains the query. Use it for "when is there lasagne this week?" or "where can I get a burrito tomorrow?" instead of calling get_menu for every restaurant. Matching is case- and accent-insensitive and every word of the query must appear in the dish name (English dish names; spelling varies, so if nothing is found try a shorter stem such as "lasagn"). Returns matches sorted by date with restaurant, dish, vegetarian/vegan flags (vegan counts as vegetarian) and the student price in EUR. Searches at most ${MAX_DAYS} days from \`from\`; at most ${MAX_MATCHES} matches are returned (\`totalMatches\` shows the real count).`,
  inputSchema: {
    query: z
      .string()
      .trim()
      .min(2)
      .describe('Part of the dish name, e.g. "lasagna" or "burrito"'),
    from: dateSchema.describe('First day to search, YYYY-MM-DD (e.g. today)'),
    days: z
      .number()
      .int()
      .min(1)
      .max(MAX_DAYS)
      .default(MAX_DAYS)
      .describe(`Number of days to search including \`from\` (1-${MAX_DAYS})`),
  },
  run: async ({ query, from, days }, quivr) => {
    const words = normalise(query).split(/\s+/).filter(Boolean)
    const dates = Array.from({ length: Math.min(days, MAX_DAYS) }, (_, i) =>
      addDays(from, i)
    )
    const { restaurants } = await quivr.listRestaurants()

    const menus = await Promise.all(
      dates.flatMap(date =>
        restaurants.map(async restaurant => ({
          date,
          menu: (await quivr.getMenu(restaurant.id, date)).restaurants[0],
        }))
      )
    )

    const seen = new Set<string>()
    const matches = menus
      .flatMap(({ date, menu }) =>
        (menu?.dishes ?? []).map(dish => ({
          date,
          restaurant: menu?.name ?? '',
          dish: dish.name.trim().replace(/[.,;]+$/, ''),
          vegetarian: dish.vegetarian || dish.vegan,
          vegan: dish.vegan,
          price: dish.prices[0],
        }))
      )
      .filter(match => {
        const name = normalise(match.dish)
        if (!words.every(word => name.includes(word))) return false
        const key = `${match.date}|${match.restaurant}|${match.dish}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .sort(
        (a, b) =>
          a.date.localeCompare(b.date) ||
          a.restaurant.localeCompare(b.restaurant) ||
          a.dish.localeCompare(b.dish)
      )

    return {
      query,
      from: dates[0],
      to: dates[dates.length - 1],
      totalMatches: matches.length,
      matches: matches.slice(0, MAX_MATCHES),
    }
  },
})
