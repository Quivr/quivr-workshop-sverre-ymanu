import { defineEval, type EvalCase } from './lib/define-eval.js'
import {
  findRestaurant,
  fixtures,
  timeOf,
  today,
  upcomingItems,
} from './lib/fixture-data.js'

// Same questions as starter.eval.ts, but the agent may only use run_graphql_query.
// Compare the two result files in evals/results/. See docs/generic-graphql.md.
const DONT_KNOW =
  /(don't|do not|couldn't|could not|can't|cannot) (know|find|see)|no information|not (in|on) (your|the)|no .*(exam|record|restaurant)|doesn't (show|include|contain)|does not|isn't|is not/i

const nextClassCase = async (): Promise<EvalCase> => {
  const next = (await upcomingItems())[0]
  return {
    name: 'next class',
    question: 'Where is my next class?',
    expected: next
      ? `${next.title} at ${next.locations?.map(l => l.name).join(', ')} starting ${timeOf(next.startTime)}`
      : 'There are no upcoming classes in the schedule.',
    facts: next
      ? [next.locations?.[0]?.name ?? next.title, timeOf(next.startTime)]
      : [DONT_KNOW],
    tools: ['run_graphql_query'],
  }
}

const vegetarianCase = async (): Promise<EvalCase> => {
  const restaurant = await findRestaurant('Alma 2')
  const { restaurants } = await fixtures.getMenu(restaurant.id, today())
  const veggie = (restaurants[0]?.dishes ?? []).filter(
    d => d.mealCategory === 'WARM_BUFFET' && (d.vegetarian || d.vegan)
  )
  return {
    name: `vegetarian warm meal at ${restaurant.name} today`,
    question: `Which vegetarian warm meals are there at ${restaurant.name} today?`,
    expected: veggie.length
      ? `Vegetarian (including vegan) warm meals: ${veggie.map(d => d.name).join(', ')}`
      : 'There are no vegetarian warm meals (or the restaurant is closed).',
    facts: veggie.slice(0, 2).map(d => d.name),
    tools: ['run_graphql_query'],
  }
}

const cases: EvalCase[] = [
  await nextClassCase(),
  await vegetarianCase(),
  {
    name: 'list restaurants',
    question: 'Which student restaurants are there?',
    expected: `The restaurants: ${(await fixtures.listRestaurants()).restaurants.map(r => r.name).join(', ')}`,
    facts: (await fixtures.listRestaurants()).restaurants
      .slice(0, 2)
      .map(r => r.name),
    tools: ['run_graphql_query'],
  },
  {
    name: 'unknown exam (must not invent)',
    question: 'Where is my Machine Learning exam?',
    expected:
      "The assistant says it can't find a Machine Learning exam in the schedule and doesn't invent a room or time.",
    facts: [DONT_KNOW],
    tools: ['run_graphql_query'],
  },
]

defineEval('generic-graphql', cases, {
  onlyTools: ['run_graphql_query'],
  skip:
    process.env.ENABLE_GENERIC_GRAPHQL === 'true'
      ? undefined
      : 'set ENABLE_GENERIC_GRAPHQL=true to run',
})
