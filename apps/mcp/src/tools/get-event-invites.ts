import { z } from 'zod'

import { defineTool } from './define-tool.js'

export const getEventInvites = defineTool({
  name: 'get_event_invites',
  description:
    'Get the event invites the logged-in student has received from friends: who invited them (first name), the event title, start, end (ISO 8601, Brussels time), location and whether the invite is already accepted. Use it for questions like "do I have event invites?" or "who invited me to what?". By default only pending invites are returned; set onlyPending to false to include accepted ones too. Read-only: it cannot accept or decline invites.',
  inputSchema: {
    onlyPending: z
      .boolean()
      .default(true)
      .describe(
        'Only invites not yet accepted (default). False: include accepted.'
      ),
  },
  run: async ({ onlyPending }, quivr) => {
    const { receivedEventInvites } =
      await quivr.getReceivedEventInvites(!onlyPending)
    return receivedEventInvites
      .map(invite => ({
        id: invite.id,
        event: invite.event.title,
        start: invite.event.startTime,
        end: invite.event.endTime,
        allDay: invite.event.allDay,
        location: invite.event.locations
          ?.map(location => location.name ?? location.address)
          .filter(Boolean)
          .join(', '),
        invitedBy: invite.sender.firstName,
        accepted: invite.accepted,
      }))
      .sort((a, b) => a.start.localeCompare(b.start))
  },
})
