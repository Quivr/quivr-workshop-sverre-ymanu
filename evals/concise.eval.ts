import { defineEval, type EvalCase } from './lib/define-eval.js'
import {
  findRestaurant,
  fixtures,
  today,
  tomorrow,
} from './lib/fixture-data.js'

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const anyOf = (names: string[]) =>
  new RegExp(names.map(name => escape(name.toLowerCase())).join('|'))

const clean = (name: string) => name.trim().replace(/[.,;]+$/, '')

type Dish = {
  name: string
  mealCategory: string | null
  vegetarian: boolean
  vegan: boolean
}

const menus = async (date: string) => {
  const { restaurants } = await fixtures.listRestaurants()
  return Promise.all(
    restaurants.map(async restaurant => {
      const { restaurants: menu } = await fixtures.getMenu(restaurant.id, date)
      return {
        name: restaurant.name,
        dishes: (menu[0]?.dishes ?? []) as Dish[],
      }
    })
  )
}

/** Hot main dishes: free add-ons such as grated cheese are also WARM_BUFFET. */
const warm = (dishes: Dish[]) =>
  dishes.filter(
    dish => dish.mealCategory === 'WARM_BUFFET' && !/for free/i.test(dish.name)
  )

const summary = (rows: { name: string; dishes: Dish[] }[]) =>
  rows
    .map(row => `${row.name}: ${row.dishes.map(d => clean(d.name)).join(', ')}`)
    .join('; ')

const lunchCase = async (): Promise<EvalCase> => {
  const all = await menus(today())
  const rows = all
    .map(m => ({ name: m.name, dishes: warm(m.dishes) }))
    .filter(m => m.dishes.length)
  const none = all.filter(m => !warm(m.dishes).length).map(m => m.name)
  return {
    name: 'broad: lunch today (summary, not every dish)',
    question: "What's for lunch at the student restaurants today?",
    expected: `A short summary of the warm main dishes. Exactly these restaurants have warm main dishes today: ${summary(rows)}. The assistant covers all of them (it may shorten each list). The other restaurants (${none.join(', ')}) have no warm main dishes today (Alma ESAT2 only lists free grated cheese), so saying they have none is correct. It does not list every sandwich, snack and drink. It may offer to show more.`,
    facts: rows.map(r => r.name),
    tools: ['list_restaurants', 'get_menu'],
    maxWords: 150,
  }
}

const vegetarianTomorrowCase = async (): Promise<EvalCase> => {
  const all = await menus(tomorrow())
  const rows = all
    .map(m => ({
      name: m.name,
      dishes: warm(m.dishes).filter(d => d.vegetarian || d.vegan),
    }))
    .filter(m => m.dishes.length)
  return {
    name: 'broad: vegetarian tomorrow (summary)',
    question: "What's vegetarian at the student restaurants tomorrow?",
    expected: `A short summary of vegetarian (including vegan) warm main dishes tomorrow. Exactly these restaurants have them: ${summary(rows)}. The assistant covers all of them. Other restaurants have no vegetarian warm main dish (free grated cheese does not count as a dish). It does not dump every vegetarian sandwich, snack and dessert and may offer to show more.`,
    facts: rows.map(r => r.name),
    tools: ['list_restaurants', 'get_menu'],
    maxWords: 150,
  }
}

const leastBusyCase = async (): Promise<EvalCase> => {
  const { libraries } = await fixtures.getLibraries()
  const live = libraries
    .filter(l => l.data && l.data.capacity > 0)
    .map(l => ({
      name: l.name,
      ratio: l.data!.occupancy / l.data!.capacity,
      occupancy: l.data!.occupancy,
    }))
    .sort((a, b) => a.ratio - b.ratio)
  const nonEmpty = live.filter(l => l.occupancy > 0)
  const names = [live[0], nonEmpty[0]].filter(Boolean).map(l => l!.name)
  return {
    name: 'library least busy (no unsupported claims)',
    question: 'Which library is least busy right now?',
    expected: `Names the least busy library (${names.join(' or ')}) in one or two sentences, based on the occupancy data. It adds no ranking of other libraries, no "next best" option and no claims (opening hours, quiet areas) that are not in the tool output.`,
    facts: [anyOf(names)],
    tools: ['get_library_occupancy'],
    maxWords: 80,
  }
}

const narrowCase = async (): Promise<EvalCase> => {
  const restaurant = await findRestaurant('Alma 2')
  const { restaurants } = await fixtures.getMenu(restaurant.id, today())
  const dishes = warm(restaurants[0]?.dishes ?? [])
  return {
    name: 'narrow: warm dishes at one restaurant (must list them)',
    question: `Which warm dishes are there at ${restaurant.name} today?`,
    expected: `All warm dishes at ${restaurant.name} today: ${dishes.map(d => clean(d.name)).join(', ')}`,
    facts: dishes.map(d => clean(d.name)),
    tools: ['list_restaurants', 'get_menu'],
    maxWords: 150,
  }
}

const fullMenuCase = async (): Promise<EvalCase> => {
  const restaurant = await findRestaurant('Alma 2')
  const { restaurants } = await fixtures.getMenu(restaurant.id, today())
  const dishes = restaurants[0]?.dishes ?? []
  return {
    name: 'explicit full menu (length allowed)',
    question: `Give me the full menu of ${restaurant.name} today, every dish.`,
    expected: `The full menu of ${restaurant.name} today, including the warm dishes (${warm(
      dishes
    )
      .map(d => clean(d.name))
      .join(
        ', '
      )}) and the other categories such as soup, sandwiches and desserts.`,
    facts: warm(dishes).map(d => clean(d.name)),
    tools: ['list_restaurants', 'get_menu'],
  }
}

const cases: EvalCase[] = [
  await lunchCase(),
  await vegetarianTomorrowCase(),
  await leastBusyCase(),
  await narrowCase(),
  await fullMenuCase(),
]

defineEval('concise', cases)
