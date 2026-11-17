import { z } from 'zod'

import { dateSchema, defineTool } from './define-tool.js'
import {
  formatBrussels,
  freeSlots,
  toInterval,
  wakingWindow,
  type Interval,
} from './free-slots.js'

const FROM_HOUR = 8
const TO_HOUR = 20
const MAX_FRIENDS = 10
const DEFAULT_MIN_MINUTES = 30

export const findCommonFreeSlots = defineTool({
  name: 'find_common_free_slots',
  description: `Find the time slots on one day when the student and all the given friends are free, between ${String(FROM_HOUR).padStart(2, '0')}:00 and ${TO_HOUR}:00 Brussels time. Call get_friends first to get the friend ids from names. The result lists the slots (start, end in ISO 8601 Brussels time, minutes), the first names of everyone included and the friends whose schedule showed nothing. Friends only share what they chose to share, so always say "free according to shared schedules": a friend with no shared items may simply share nothing. Friends' event titles and locations are never returned and must not be asked for. This only looks up times; it does not invite anyone.`,
  inputSchema: {
    friendIds: z
      .array(z.string())
      .min(1)
      .max(MAX_FRIENDS)
      .describe('Friend ids from get_friends'),
    date: dateSchema.describe('The day to check, YYYY-MM-DD'),
    minMinutes: z
      .number()
      .int()
      .min(5)
      .max(720)
      .optional()
      .describe(
        `Shortest slot to report, in minutes (default ${DEFAULT_MIN_MINUTES})`
      ),
  },
  run: async ({ friendIds, date, minMinutes = DEFAULT_MIN_MINUTES }, quivr) => {
    const ids = [...new Set(friendIds)].sort()
    const { friendList } = await quivr.getFriends()
    const unknown = ids.filter(id => !friendList.some(f => f.id === id))
    if (unknown.length > 0) {
      throw new Error(
        `Unknown friend id(s): ${unknown.join(', ')}. Use get_friends to find the ids.`
      )
    }

    const [mine, ...theirs] = await Promise.all([
      quivr.getMySchedule(date),
      ...ids.map(id => quivr.getFriendSchedules([id], date)),
    ])

    const window = wakingWindow(date, FROM_HOUR, TO_HOUR)
    const busy: Interval[] = []
    for (const item of mine.scheduleItems.scheduleItems) {
      const span = toInterval(item.startTime, item.endTime)
      if (span) busy.push(span)
    }

    const names: string[] = []
    const sharedNothing: string[] = []
    ids.forEach((id, index) => {
      const name = friendList.find(f => f.id === id)?.firstName ?? id
      names.push(name)
      const items = (theirs[index]?.friendSchedules ?? [])
        .filter(schedule => schedule.friendId === id)
        .flatMap(schedule => schedule.scheduleItems)
      if (items.length === 0) sharedNothing.push(name)
      for (const item of items) {
        const span = item.allDay
          ? window
          : toInterval(item.startTime, item.endTime)
        if (span) busy.push(span)
      }
    })

    return {
      date,
      searchedBetween: `${formatBrussels(window.start)} and ${formatBrussels(window.end)}`,
      minMinutes,
      participants: ['you', ...names],
      slots: freeSlots(window, busy, minMinutes).map(slot => ({
        start: formatBrussels(slot.start),
        end: formatBrussels(slot.end),
        minutes: Math.round((slot.end - slot.start) / 60_000),
      })),
      sharedNothing,
      note: 'Free according to shared schedules. All-day items count as busy.',
    }
  },
})
