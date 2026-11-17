import { defineEval, type EvalCase } from './lib/define-eval.js'
import {
  findRestaurant,
  fixtures,
  timeOf,
  today,
  upcomingItems,
} from './lib/fixture-data.js'

/**
 * quivr-mannetje (apps/frontend/src/components/QuivrMannetje.tsx) is a pure UI
 * feature, but his tour makes promises about the assistant. These cases check
 * the agent keeps them:
 *  1. you can ask about schedule, menus and library occupancy
 *  2. in your own language
 *  3. answers come only from your Quivr data, otherwise "I don't know"
 *  4. the example questions he points to work
 * Keep the example questions in sync with EXAMPLES in apps/frontend/src/App.tsx.
 */

const DONT_KNOW =
  /(don't|do not|couldn't|could not|can't|cannot|unable to|not able to) (know|find|see|check|access|look|tell|help)|no information|no data|not (in|on) (your|the)|doesn't (show|include|contain|have)|does not|isn't|is not|no tool/i

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const anyOf = (names: string[]) =>
  new RegExp(names.map(name => escape(name.toLowerCase())).join('|'))

const next = (await upcomingItems())[0]
// The wording varies a lot ("no classes", "schedule is empty", "I can't find one")
const NO_CLASSES =
  /\b(no|empty|nothing|geen|(can't|cannot|couldn't) find|(don't|do not) see)\b/i

const alma = await findRestaurant('Alma 2')
const { restaurants: almaMenu } = await fixtures.getMenu(alma.id, today())
const firstDish = almaMenu[0]?.dishes[0]?.name

const { libraries } = await fixtures.getLibraries()
const ranked = libraries
  .filter(l => l.data && l.data.capacity > 0 && l.data.occupancy > 0)
  .map(l => ({ name: l.name, ratio: l.data!.occupancy / l.data!.capacity }))
  .sort((a, b) => a.ratio - b.ratio)
const emptyOnes = libraries
  .filter(l => l.data?.occupancy === 0)
  .map(l => l.name)

const cases: EvalCase[] = [
  {
    name: 'what can you do (the tour promise)',
    question: 'What can you help me with?',
    expected:
      'A short friendly answer that says it can help with the student schedule, restaurant menus and library occupancy. It does not claim abilities beyond that.',
    facts: [/schedule|class|timetable/, /menu|restaurant|lunch|food/, /librar/],
  },
  {
    name: 'example question: menu and next class',
    question: "What's on the menu at Alma 2 today and where is my next class?",
    expected: next
      ? `Lists the dishes at Alma 2 today and the next class (${next.title}, ${next.locations?.map(l => l.name).join(', ') || 'location unknown'}, starting ${timeOf(next.startTime)}).`
      : 'Lists the dishes at Alma 2 today and says there are no upcoming classes in the schedule.',
    facts: [
      ...(firstDish ? [firstDish] : []),
      next ? timeOf(next.startTime) : NO_CLASSES,
    ],
    // The schedule part may come from get_my_schedule or get_today_overview
    tools: ['get_menu'],
  },
  {
    name: 'example question: least busy library',
    question: 'Which library is least busy right now?',
    expected: ranked[0]
      ? `${ranked[0].name} is the least busy. ${emptyOnes.length ? `${emptyOnes.join(', ')} show 0 people, which may mean closed or not reporting: naming one of those instead is also correct.` : ''}`
      : 'No occupancy data.',
    facts: ranked[0] ? [anyOf([ranked[0].name, ...emptyOnes])] : [DONT_KNOW],
    tools: ['get_library_occupancy'],
  },
  {
    name: 'example question: vegetarian tomorrow',
    question: "What's vegetarian at the student restaurants tomorrow?",
    expected:
      'Lists vegetarian (including vegan) dishes from the restaurant menus for tomorrow, or says honestly that nothing vegetarian or no menu is available.',
    tools: ['list_restaurants', 'get_menu'],
  },
  {
    name: 'answers in the language of the question (Dutch)',
    question: 'Waar is mijn volgende les?',
    expected: next
      ? `The answer is written in Dutch and names the next class (${next.title}) with its location and start time ${timeOf(next.startTime)}.`
      : 'The answer is written in Dutch and says there are no upcoming classes in the schedule.',
    facts: next ? [timeOf(next.startTime)] : [/geen|niet|niks/],
    tools: ['get_my_schedule'],
  },
  {
    name: 'data that no tool can give (must not invent)',
    question: 'What was my grade for Machine Learning last semester?',
    expected:
      "The assistant says it has no way to look up grades and doesn't invent a grade.",
    facts: [DONT_KNOW],
    forbidden: [/\b\d{1,2}\s*\/\s*20\b/, /\bgrade (was|is) \d/],
  },
]

defineEval('mannetje', cases)
