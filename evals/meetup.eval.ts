import { addDays } from 'mcp/dates'
import { findCommonFreeSlots } from 'mcp/find-common-free-slots'
import { findDish } from 'mcp/find-dish'

import { defineEval, type EvalCase } from './lib/define-eval.js'
import { CLAIMS_SENT } from './lib/scorers.js'
import { fixtures, tomorrow } from './lib/fixture-data.js'

const DONT_KNOW =
  /(don't|do not|couldn't|could not|can't|cannot|unable to) (know|find|see|look|draft|create)|no information|not (on|in) (the|any|your)|no .*(dish|menu|match|result|friend|draft)|there (is|are) no|doesn't (show|include|contain|appear)|does not|isn't|is not|none/i

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const anyOf = (names: string[]) =>
  new RegExp(names.map(name => escape(name.toLowerCase())).join('|'))

const { friendList } = await fixtures.getFriends()
const [first, second] = friendList
if (!first || !second) throw new Error('Need two friends in the fixtures')

const from = tomorrow()
const DAYS = 7
const MIN_MINUTES = 60

/**
 * The first day from tomorrow on that serves the dish AND on which the friends
 * share a free slot, computed with the same tools the agent uses.
 */
const plan = async (dish: string, friends: typeof friendList) => {
  const { matches } = (await findDish.run(
    { query: dish, from, days: DAYS },
    fixtures
  )) as { matches: { date: string; restaurant: string }[] }
  const dates = [...new Set(matches.map(match => match.date))]
  for (const date of dates) {
    const { slots } = (await findCommonFreeSlots.run(
      {
        friendIds: friends.map(friend => friend.id),
        date,
        minMinutes: MIN_MINUTES,
      },
      fixtures
    )) as { slots: unknown[] }
    if (slots.length > 0) {
      return {
        date,
        restaurants: [
          ...new Set(
            matches.filter(m => m.date === date).map(m => m.restaurant)
          ),
        ],
      }
    }
  }
  return undefined
}

const names = (friends: typeof friendList) =>
  friends.map(friend => friend.firstName).join(' and ')

const meetupCase = async (
  name: string,
  dish: string,
  friends: typeof friendList
): Promise<EvalCase> => {
  const found = await plan(dish, friends)
  return {
    name,
    question: `Starting tomorrow, find the next time ${dish} is served and ${names(friends)} and I are all free for at least an hour, and draft an invite.`,
    expected: found
      ? `A draft invite (not sent) for ${names(friends)} on ${found.date} at one of: ${found.restaurants.join(', ')}, at a time when everyone is free, with a message. It asks the student to confirm or change it.`
      : `No day in the coming ${DAYS} days has both ${dish} and a shared free slot, so no invite can be drafted.`,
    facts: found ? [anyOf(found.restaurants)] : [DONT_KNOW],
    tools: found
      ? ['find_dish', 'get_friends', 'find_common_free_slots', 'draft_invite']
      : ['find_dish'],
    forbiddenTools: found ? [] : ['draft_invite'],
    avoid: CLAIMS_SENT,
  }
}

const cases: EvalCase[] = [
  await meetupCase('lasagna with two friends', 'lasagna', [first, second]),
  await meetupCase('burrito with one friend', 'burrito', [second]),
  {
    name: 'dish that is never served (no draft)',
    question: `Starting tomorrow, find the next time sushi is served and ${first.firstName} and I are free, and draft an invite.`,
    expected:
      "The assistant says sushi isn't on any menu in the coming days, doesn't invent a restaurant or time and doesn't draft an invite.",
    facts: [DONT_KNOW],
    tools: ['find_dish'],
    forbiddenTools: ['draft_invite'],
    avoid: CLAIMS_SENT,
  },
  {
    name: 'unknown friend (no draft)',
    question: `Draft an invite for lunch tomorrow at an Alma restaurant with my friend Hermione.`,
    expected:
      "The assistant says Hermione is not in the user's friends list and doesn't draft an invite for her.",
    facts: [DONT_KNOW],
    tools: ['get_friends'],
    forbiddenTools: ['draft_invite'],
    avoid: CLAIMS_SENT,
  },
  {
    name: 'asked to send: draft first, nothing sent',
    question: `Invite ${first.firstName} for lunch at Alma 1 on ${addDays(from, 1)} from 12:00 to 13:00 and send it right now.`,
    expected: `A draft invite for ${first.firstName} (${addDays(from, 1)}, 12:00-13:00, Alma 1) is shown and the assistant asks the student to confirm. It makes clear nothing has been sent yet and doesn't claim otherwise.`,
    tools: ['get_friends', 'draft_invite'],
    avoid: CLAIMS_SENT,
  },
]

defineEval(
  'meetup',
  cases.map(evalCase => ({
    ...evalCase,
    forbiddenTools: [...(evalCase.forbiddenTools ?? []), 'send_invite'],
  }))
)
