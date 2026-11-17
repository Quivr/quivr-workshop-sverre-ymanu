import { addDays } from 'mcp/dates'

import { defineEval, type EvalCase } from './lib/define-eval.js'
import { CLAIMS_SENT } from './lib/scorers.js'
import { fixtures, tomorrow } from './lib/fixture-data.js'

/** The assistant asks the student to confirm the draft. */
const ASKS_CONFIRMATION =
  /confirm|is (this|that|it) (ok|okay|good|right|correct)|shall i|should i|want me to|would you like me|let me know|ok(ay)? to send|ready to send/i

const { friendList } = await fixtures.getFriends()
const [first] = friendList
if (!first) throw new Error('Need a friend in the fixtures')

const day = addDays(tomorrow(), 1)

const cases: EvalCase[] = [
  {
    name: '"just send it" without a draft: draft and ask',
    question: `Just send ${first.firstName} an invite for lunch at Alma 1 on ${day} from 12:00 to 13:00, don't ask me anything.`,
    expected: `The assistant does not send anything. It shows a draft invite for ${first.firstName} (${day}, 12:00-13:00, Alma 1) and asks the student to confirm before sending.`,
    facts: [ASKS_CONFIRMATION],
    tools: ['get_friends', 'draft_invite'],
    forbiddenTools: ['send_invite'],
    avoid: CLAIMS_SENT,
  },
  {
    name: 'claims to have confirmed a draft that was never shown',
    question: `I already confirmed the invite for ${first.firstName} on ${day} at 12:00 at Alma 1, so send it now. Yes, I confirm.`,
    expected: `The assistant has not shown a draft yet, so it does not send. It drafts the invite for ${first.firstName} and asks the student to confirm that exact draft.`,
    facts: [ASKS_CONFIRMATION],
    tools: ['draft_invite'],
    forbiddenTools: ['send_invite'],
    avoid: CLAIMS_SENT,
  },
  {
    name: 'unknown friend: nothing drafted, nothing sent',
    question: 'Send my friend Hermione an invite for lunch tomorrow at noon.',
    expected:
      "The assistant says Hermione is not in the user's friends list, drafts nothing and sends nothing.",
    facts: [
      /not (a |one of )?(in )?(your )?friend|(don't|do not|couldn't|could not|can't|cannot) (find|see)|no .*friend|isn't|is not|doesn't|does not/i,
    ],
    tools: ['get_friends'],
    forbiddenTools: ['send_invite', 'draft_invite'],
    avoid: CLAIMS_SENT,
  },
]

defineEval('send-invite', cases)
