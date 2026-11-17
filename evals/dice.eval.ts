import { formatRollMessage } from '../apps/frontend/src/dice/prompts.js'

import { defineEval, type EvalCase } from './lib/define-eval.js'

/** Every write tool: a dice question must never send or draft anything. */
const WRITE_TOOLS = ['send_invite', 'draft_invite']

const DONT_FAIL =
  'A short, friendly answer based on tool results. It answers the question (or says honestly that the data does not contain it, e.g. an empty schedule or no match). It is not an error, not a refusal and does not ask the student for ids or dates.'

/**
 * One case per covered roll, sending exactly what the dice button sends ("🎲 N: ...").
 * 1 library, 3 find_dish, 5 deals, 7 schedule, 9 events, 11 friends, 14 today overview,
 * 18 find_dish (a dish that may not exist), 20 the jackpot combination.
 * The other rolls reuse the same tools with other wording.
 */
const ROLLS: Record<number, { tools: string[]; expected: string }> = {
  1: {
    tools: ['get_library_occupancy'],
    expected:
      'Names the least busy library based on the occupancy data, in a light tone. It does not invent numbers.',
  },
  3: {
    tools: ['find_dish'],
    expected:
      'Says where and when pizza is served this week according to the menus, or says honestly that no menu has pizza. It does not invent a restaurant or date.',
  },
  5: {
    tools: ['get_partner_deals'],
    expected:
      'Lists current partner deals (coffee or snacks if any), or says honestly that no such deal is available. It does not invent a deal.',
  },
  7: {
    tools: ['get_my_schedule'],
    expected:
      'Gives the next class with its time and location from the schedule, or says honestly that there is no class coming up.',
  },
  9: {
    tools: ['get_events'],
    expected:
      'Lists upcoming campus events from the events feed, with titles and dates, or says honestly there are none.',
  },
  11: {
    tools: ['get_friends', 'find_common_free_slots'],
    expected:
      'Gives the times when the student and their friends are free according to shared schedules, or says honestly there is no common slot. It does not invite anyone.',
  },
  14: {
    tools: ['get_today_overview'],
    expected:
      "Summarises today's classes and a lunch menu near the next class, or says honestly that nothing is scheduled. It does not invent dishes.",
  },
  18: {
    tools: ['find_dish'],
    expected:
      'Says where and when a vegan burger is served this week according to the menus, or says honestly that no menu has one. It does not invent a restaurant or date.',
  },
  20: {
    tools: ['get_events', 'get_today_overview'],
    expected:
      "A combined answer: today's classes with the next class, a lunch option near it, and what is happening on campus tonight, all from tool results. Parts the data does not cover are said honestly, nothing is invented.",
  },
}

const cases: EvalCase[] = Object.entries(ROLLS).map(
  ([roll, { tools, expected }]): EvalCase => ({
    name: `roll ${roll}`,
    question: formatRollMessage(Number(roll)),
    expected: `${DONT_FAIL} ${expected}`,
    tools,
    forbiddenTools: WRITE_TOOLS,
  })
)

defineEval('dice', cases)
