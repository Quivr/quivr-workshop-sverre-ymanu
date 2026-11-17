import { z } from 'zod'

import { dayRange } from '../quivr/dates.js'
import { dateSchema, defineTool } from './define-tool.js'
import { stripHtml } from './get-news.js'

const FETCH_COUNT = 10
const DEFAULT_LIMIT = 8
const MAX_LIMIT = 20
const DESCRIPTION_LENGTH = 200

const shorten = (text: string) =>
  text.length > DESCRIPTION_LENGTH
    ? `${text.slice(0, DESCRIPTION_LENGTH).trimEnd()}…`
    : text

const price = (cents: number) =>
  cents === 0 ? 'free' : `€${(cents / 100).toFixed(2)}`

const time = (iso: string) => new Date(iso).getTime()

export const getEvents = defineTool({
  name: 'get_events',
  description:
    'Get upcoming campus events (parties, concerts, talks, sports, ...) from the Quivr events feed, sorted by start time: title, start and end (ISO), location, organiser, short description, ticket kinds with prices (when the event sells tickets) and url. `total` is the number of matching events, of which at most `limit` are returned. Pass `from` (YYYY-MM-DD, take it from today\'s date in the system prompt) to drop events that ended before that day. Use this for "what is happening on campus", "any parties or concerts coming up?" and ticket price questions; it does not return the user\'s own schedule or tickets. Fields that are missing are not known: do not guess them.',
  inputSchema: {
    from: dateSchema
      .optional()
      .describe('Only events that have not ended before this day, YYYY-MM-DD'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_LIMIT)
      .optional()
      .describe(`Number of events, default ${DEFAULT_LIMIT}, max ${MAX_LIMIT}`),
  },
  run: async ({ from, limit }, quivr) => {
    const { eventSpecificationsFeed } = await quivr.getEvents(FETCH_COUNT)
    const earliest = from ? time(dayRange(from).startTime) : undefined

    const seen = new Set<string>()
    const events = (eventSpecificationsFeed.nodes ?? [])
      .flatMap(section => section?.eventSpecifications.nodes ?? [])
      .filter(event => event !== null)
      .filter(event => !seen.has(event.id) && seen.add(event.id))
      .filter(
        event =>
          earliest === undefined ||
          time(event.endTime ?? event.startTime) >= earliest
      )
      .sort((a, b) => time(a.startTime) - time(b.startTime))

    return {
      from,
      total: events.length,
      events: events.slice(0, limit ?? DEFAULT_LIMIT).map(event => {
        const location = event.locations[0]
        const organiser = event.companies.map(c => c.name).join(', ')
        const tickets = event.registration?.ticketKinds.map(kind => ({
          name: kind.name,
          price: price(kind.priceCents),
          soldOut: kind.soldOut,
        }))
        return {
          id: event.id,
          title: stripHtml(event.title),
          start: event.startTime,
          end: event.endTime,
          location: location?.name || location?.address || undefined,
          organiser: organiser || undefined,
          description: shorten(stripHtml(event.description ?? '')) || undefined,
          tickets: tickets?.length ? tickets : undefined,
          url: event.url || undefined,
        }
      }),
    }
  },
})
