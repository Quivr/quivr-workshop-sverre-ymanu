import { defineEval, type EvalCase } from './lib/define-eval.js'
import { fixtures, today } from './lib/fixture-data.js'
import { addDays } from 'mcp/dates'

const DONT_KNOW =
  /(don't|do not|couldn't|could not|can't|cannot) (know|find|see)|no information|not (on|in) (the|any)|no .*(dish|menu|match|result)|there (is|are) no|doesn't (show|include|contain|appear)|does not|isn't|is not|none/i

/** Every restaurant serving a dish whose name contains `text`, in the next `days` days. */
const serving = async (text: string, days: number) => {
  const { restaurants } = await fixtures.listRestaurants()
  const found = new Map<string, Set<string>>()
  for (let i = 0; i < days; i++) {
    const date = addDays(today(), i)
    for (const { id } of restaurants) {
      const menu = (await fixtures.getMenu(id, date)).restaurants[0]
      for (const dish of menu?.dishes ?? []) {
        if (!dish.name.toLowerCase().includes(text)) continue
        const places = found.get(date) ?? new Set<string>()
        places.add(menu!.name)
        found.set(date, places)
      }
    }
  }
  return found
}

const findCase = async (
  dish: string,
  days: number,
  when: string
): Promise<EvalCase> => {
  const found = await serving(dish, days)
  const first = [...found.entries()][0]
  return {
    name: `find ${dish} ${when}`,
    question: `When is there ${dish} ${when}, and where?`,
    expected: first
      ? `Dishes containing "${dish}" are served on: ${[...found.entries()].map(([date, places]) => `${date} at ${[...places].join(', ')}`).join('; ')}. The earliest is ${first[0]}.`
      : `There is no ${dish} on any menu ${when}.`,
    facts: first ? [[...first[1]][0]!] : [DONT_KNOW],
    tools: ['find_dish'],
  }
}

const cases: EvalCase[] = [
  await findCase('lasagna', 7, 'this week'),
  await findCase('burrito', 7, 'this week'),
  await findCase('spaghetti', 2, 'in the next two days'),
  {
    name: 'vegetarian options of a dish',
    question: 'Is there a vegan lasagna somewhere this week?',
    expected:
      'Yes: names the restaurant(s) and date(s) where a vegan or vegetable lasagna is served, based on the menus.',
    tools: ['find_dish'],
  },
  {
    name: 'dish that is not served (must not invent)',
    question: 'Which restaurant serves sushi this week?',
    expected:
      "The assistant says no restaurant has sushi on the menu in the coming days and doesn't invent a restaurant or date.",
    facts: [DONT_KNOW],
    tools: ['find_dish'],
  },
]

defineEval('find-dish', cases)
