import { defineEval, type EvalCase } from './lib/define-eval.js'
import { fixtures } from './lib/fixture-data.js'

const DONT_KNOW =
  /(don't|do not|couldn't|could not|can't|cannot|not able to) (know|find|see|tell|check|provide)|no information|not available|isn't (available|in)|doesn't (show|include|contain|have)|unavailable/i

const open = (await fixtures.getStudentBars(true)).fakbars
const all = (await fixtures.getStudentBars(false)).fakbars
const closed = all.filter(bar => !open.some(o => o.id === bar.id))

const cases: EvalCase[] = [
  {
    name: 'bars open now',
    question: 'Which student bars are open right now?',
    expected: open.length
      ? `The open bars: ${open.map(bar => bar.name).join(', ')}`
      : 'No student bar is open right now.',
    facts: open.length ? open.map(bar => bar.name) : [/no|none|closed/i],
    tools: ['get_student_bars'],
  },
  {
    name: 'closed bars are not listed as open',
    question: 'Is there a student bar open tonight where I can get a drink?',
    expected: open.length
      ? `Mentions the open bars (${open.map(bar => bar.name).join(', ')}) and does not claim ${closed.map(bar => bar.name).join(', ') || 'any other bar'} is open.`
      : 'Says no student bar is open.',
    facts: open.slice(0, 1).map(bar => bar.name),
    tools: ['get_student_bars'],
  },
  {
    name: 'is a specific bar open',
    question: `Is ${closed[0]?.name ?? open[0]?.name} open now?`,
    expected: closed[0]
      ? `${closed[0].name} is closed right now.`
      : `${open[0]?.name} is open right now.`,
    facts: [closed[0] ? /closed|not open|isn't open/i : /open/i],
    tools: ['get_student_bars'],
  },
  {
    name: 'opening hours (must not invent)',
    question: 'What time does the first student bar close tonight?',
    expected:
      "The assistant says it can't see closing times (only whether bars are open now) and doesn't invent a time.",
    facts: [DONT_KNOW],
    tools: ['get_student_bars'],
  },
  {
    name: 'unknown bar (must not invent)',
    question: 'Is the Hogwarts Common Room bar open tonight?',
    expected:
      "The assistant says there is no student bar with that name in the data and doesn't claim it is open.",
    facts: [/no |not |isn't|doesn't|don't|couldn't/i],
    tools: ['get_student_bars'],
  },
]

defineEval('bars', cases)
