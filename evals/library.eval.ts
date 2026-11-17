import { defineEval, type EvalCase } from './lib/define-eval.js'
import { fixtures } from './lib/fixture-data.js'

const DONT_KNOW =
  /(don't|do not|couldn't|could not|can't|cannot) (know|find|see)|no information|no live data|not (in|on) (your|the)|doesn't (show|include|contain)|does not|isn't|is not/i

const { libraries } = await fixtures.getLibraries()
const live = libraries
  .filter(l => l.data && l.data.capacity > 0)
  .map(l => ({
    name: l.name,
    percent: Math.round((l.data!.occupancy / l.data!.capacity) * 100),
    free: l.data!.capacity - l.data!.occupancy,
  }))
  .sort((a, b) => b.percent - a.percent)
const busiest = live[0]
const noData = libraries.filter(l => !l.data).map(l => l.name)

const cases: EvalCase[] = [
  {
    name: 'busiest library',
    question: 'Which library is the busiest right now?',
    expected: busiest
      ? `${busiest.name} is the busiest (about ${busiest.percent}% full).`
      : 'No occupancy data.',
    facts: busiest ? [busiest.name] : [DONT_KNOW],
    tools: ['get_library_occupancy'],
  },
  {
    name: 'one library by name',
    question: `How full is ${busiest?.name ?? 'the main library'} at the moment?`,
    expected: busiest
      ? `${busiest.name} is about ${busiest.percent}% full, with roughly ${busiest.free} seats free.`
      : 'No occupancy data.',
    facts: busiest ? [busiest.name] : [DONT_KNOW],
    tools: ['get_library_occupancy'],
  },
  {
    name: 'seats free in the least busy',
    question: 'Where can I most likely still find a free seat to study?',
    expected:
      'Names a library with a low occupancy percentage, based on the data. Any library with plenty of free seats is correct, including ones that report 0 people (which may mean closed or not reporting).',
    tools: ['get_library_occupancy'],
  },
  ...(noData.length
    ? [
        {
          name: 'library without live data (must not invent)',
          question: `How busy is ${noData[0]} right now?`,
          expected: `The assistant says there is no live occupancy data for ${noData[0]} and does not invent a number.`,
          facts: [DONT_KNOW],
          tools: ['get_library_occupancy'],
        },
      ]
    : []),
  {
    name: 'unknown library (must not invent)',
    question: 'How busy is the Hogwarts library right now?',
    expected:
      "The assistant says it can't find a library with that name and doesn't invent an occupancy.",
    facts: [DONT_KNOW],
    tools: ['get_library_occupancy'],
  },
]

defineEval('library', cases)
