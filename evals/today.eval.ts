import { defineEval, type EvalCase } from './lib/define-eval.js'
import { fixtures, timeOf, today, tomorrow } from './lib/fixture-data.js'

const DONT_KNOW =
  /(don't|do not|couldn't|could not|can't|cannot|unable to) (know|find|see|get|retrieve|access)|no (information|data|recorded)|not (in|on) (your|the)|doesn't (show|include|contain)|does not|isn't|is not|only/i

/** First restaurant (in list order) that is open with a menu on `date`. */
const firstOpenRestaurant = async (date: string) => {
  const { restaurants } = await fixtures.listRestaurants()
  for (const restaurant of restaurants) {
    const { restaurants: found } = await fixtures.getMenu(restaurant.id, date)
    const menu = found[0]
    const open = menu?.openingHours.some(day => day.data.length > 0)
    if (menu && open && menu.dishes.length > 0) return { restaurant, menu }
  }
  return undefined
}

const overviewCase = async (
  name: string,
  question: string,
  date: string
): Promise<EvalCase> => {
  const { scheduleItems } = (await fixtures.getMySchedule(date)).scheduleItems
  const next = scheduleItems.find(item => item.__typename === 'Lesson')
  const open = await firstOpenRestaurant(date)

  if (next) {
    return {
      name,
      question,
      expected: `The next class is ${next.title} at ${next.locations?.map(l => l.name).join(', ')} starting ${timeOf(next.startTime)}, followed by the menu of a restaurant close to it (the tool says which rule picked it).`,
      facts: [next.title, timeOf(next.startTime)],
      tools: ['get_today_overview'],
    }
  }
  return {
    name,
    question,
    expected: open
      ? `There are no classes. The assistant may still mention the menu of ${open.restaurant.name} (first open restaurant, e.g. ${open.menu.dishes[0]?.name}) but must not invent a class.`
      : 'There are no classes and no open restaurant with a menu.',
    facts: [open ? open.restaurant.name : DONT_KNOW],
    tools: ['get_today_overview'],
  }
}

const cases: EvalCase[] = [
  await overviewCase(
    'overview today',
    "Give me an overview of my day today: my next class and what's on the menu at the restaurant closest to it.",
    today()
  ),
  await overviewCase(
    'overview tomorrow (other wording)',
    'Where is my first class tomorrow, and where can I eat nearby?',
    tomorrow()
  ),
  {
    name: 'overview outside the recorded days (must not invent)',
    question:
      "What's my day like on 1 March 2027, and what can I eat near my class?",
    expected:
      "The assistant says it can't get the schedule or menu for that day and doesn't invent a class, room or dish.",
    facts: [DONT_KNOW],
    tools: ['get_today_overview'],
  },
  {
    name: 'teacher of next class (not in the data)',
    question:
      "What's the phone number of the teacher of my next class, and what can I eat near it?",
    expected:
      "The assistant says it doesn't have the teacher's phone number and doesn't invent one.",
    facts: [DONT_KNOW],
  },
]

defineEval('today', cases)
