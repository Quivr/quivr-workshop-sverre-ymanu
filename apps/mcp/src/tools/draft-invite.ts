import { z } from 'zod'

import { defineTool } from './define-tool.js'
import { parseInviteTimes, resolveFriends } from './invite-input.js'

const MAX_FRIENDS = 10

export const draftInvite = defineTool({
  name: 'draft_invite',
  description:
    'Prepare a DRAFT invitation to a meetup with friends, for example after find_common_free_slots has found a time everyone is free and (optionally) find_dish has found where a dish is served. Call get_friends first to get the friend ids. It only builds the draft and shows it to the student: NOTHING is created or sent to anyone, and no friend is notified. After calling it, show the draft (who, when, where, message) and ask the student whether it is OK or what to change. Always call this tool to produce the draft: never write a draft invite yourself without calling it, because the student only sees the draft card from this tool. Never say or imply that an invitation was sent. Only if the student then explicitly confirms the draft can send_invite really send it.',
  inputSchema: {
    friendIds: z
      .array(z.string())
      .min(1)
      .max(MAX_FRIENDS)
      .describe('Friend ids from get_friends'),
    start: z
      .string()
      .describe('Start, ISO 8601 with offset, e.g. 2026-11-17T12:00:00+01:00'),
    end: z
      .string()
      .describe('End, ISO 8601 with offset, must be after the start'),
    place: z
      .string()
      .trim()
      .min(1)
      .describe('Where to meet, e.g. the restaurant name'),
    message: z
      .string()
      .trim()
      .min(1)
      .describe(
        'Short friendly message to the friends, in the student language'
      ),
  },
  run: async ({ friendIds, start, end, place, message }, quivr) => {
    const times = parseInviteTimes(start, end)
    const friends = await resolveFriends(friendIds, quivr)

    return {
      status: 'draft_not_sent',
      draft: {
        friends,
        ...times,
        place,
        message,
      },
      note: 'This is only a draft. Nothing was sent and nobody was notified. Ask the student to confirm or change it.',
    }
  },
})
