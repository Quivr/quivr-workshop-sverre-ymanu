import { defineEval, type EvalCase } from './lib/define-eval.js'
import { fixtures } from './lib/fixture-data.js'

const DONT_KNOW =
  /(don't|do not|couldn't|could not|can't|cannot) (know|find|see)|no (event )?invites?|no information|not (in|on) (your|the)|doesn't (show|include|contain)|does not|isn't|is not|haven't|have not/i

const { receivedEventInvites: pending } =
  await fixtures.getReceivedEventInvites(false)
const { receivedEventInvites: all } =
  await fixtures.getReceivedEventInvites(true)
const accepted = all.filter(invite => invite.accepted)
const first = pending[0]
const senders = new Set(all.map(invite => invite.sender.firstName))
const stranger =
  ['Jordan', 'Taylor', 'Morgan'].find(name => !senders.has(name)) ?? 'Jordan'

const titleFact = (title: string) =>
  new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')

const cases: EvalCase[] = [
  {
    name: 'pending invites',
    question: 'Do I have any pending event invites?',
    expected: pending.length
      ? `Lists the pending invites: ${pending.map(i => `${i.event.title} from ${i.sender.firstName}`).join('; ')}`
      : 'There are no pending event invites.',
    facts: pending.length
      ? pending.map(i => titleFact(i.event.title))
      : [DONT_KNOW],
    tools: ['get_event_invites'],
  },
  {
    name: 'who invited me',
    question: first
      ? `Who invited me to "${first.event.title}"?`
      : 'Who invited me to an event?',
    expected: first
      ? `${first.sender.firstName} invited the student to ${first.event.title}.`
      : 'There are no event invites.',
    facts: first ? [first.sender.firstName] : [DONT_KNOW],
    tools: ['get_event_invites'],
  },
  {
    name: 'invite already accepted',
    question: 'Which event invites have I already accepted?',
    expected: accepted.length
      ? `Lists the accepted invites: ${accepted.map(i => i.event.title).join(', ')}`
      : 'There are no accepted event invites.',
    facts: accepted.length
      ? accepted.map(i => titleFact(i.event.title))
      : [DONT_KNOW],
    tools: ['get_event_invites'],
  },
  {
    name: 'invite from someone who did not invite me (must not invent)',
    question: `What event did ${stranger} invite me to?`,
    expected: `${stranger} has not sent any invite. The assistant says it can't find an invite from ${stranger} and doesn't invent an event.`,
    facts: [DONT_KNOW],
    tools: ['get_event_invites'],
  },
]

defineEval('invites', cases)
