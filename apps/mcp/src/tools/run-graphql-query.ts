import { z } from 'zod'

import { defineTool } from './define-tool.js'
import { parseSingleQuery } from '../quivr/raw-query.js'

export const MAX_RESPONSE_CHARS = 20_000

export const runGraphqlQuery = defineTool({
  name: 'run_graphql_query',
  description: [
    'Run one read-only GraphQL query against the Quivr backend and return the JSON `data`.',
    'Prefer the purpose-built tools (get_my_schedule, list_restaurants, get_menu, get_library_occupancy) when one fits: they are faster and return compact output. Use this only for data they cannot give.',
    'Only a single `query` operation is accepted: no mutations, subscriptions or fragment definitions (inline the fields). Maximum 8 levels deep. Large responses are truncated, so ask for few fields and use arguments to narrow down.',
    'Useful root fields (TimeRangeInput is { startTime, endTime } as ISO 8601 times with offset, e.g. 2026-11-13T00:00:00+01:00):',
    '- friendList { id firstName lastName }',
    '- friendSchedules(friendIds: ["1"], timeRange: $timeRange) { friendId scheduleItems { title startTime endTime allDay locations { name } } }',
    '- findFriend(query: "name") { nodes { id firstName lastName } }',
    '- receivedEventInvites { id event { title startTime } sender { firstName } accepted }',
    '- newsArticlesV2(first: 5) { ... } and newsArticlesTopics',
    '- fakbars(onlyShowOpen: true) { ... }',
    '- restaurants { id name dishes(timeRange: $timeRange) { name vegetarian favorite } }',
    '- libraries { name data { occupancy capacity } }',
    'Example: query($timeRange: TimeRangeInput!) { restaurants { name dishes(timeRange: $timeRange) { name } } } with variables {"timeRange": {"startTime": "2026-11-13T00:00:00+01:00", "endTime": "2026-11-13T23:59:59+01:00"}}.',
    'If the backend reports an unknown field or argument, fix the query, or introspect with { __type(name: "Query") { fields { name } } }.',
  ].join('\n'),
  inputSchema: {
    query: z.string().describe('A single GraphQL query operation.'),
    variables: z
      .record(z.string(), z.unknown())
      .optional()
      .describe('Values for the query variables, as a JSON object.'),
  },
  // partialJson is one long string, so the default per-string cap would cut it short
  maxStringLength: MAX_RESPONSE_CHARS + 1,
  run: async ({ query, variables }, quivr) => {
    parseSingleQuery(query)
    const data = await quivr.rawQuery(query, variables ?? {})

    const json = JSON.stringify(data)
    if (json.length <= MAX_RESPONSE_CHARS) return data
    return {
      truncated: true,
      totalChars: json.length,
      note: `The response was cut after ${MAX_RESPONSE_CHARS} characters, so the JSON below is incomplete. Ask for fewer fields or narrow the query with arguments.`,
      partialJson: json.slice(0, MAX_RESPONSE_CHARS),
    }
  },
})
