import { TIME_ZONE } from '../quivr/dates.js'

/** A half-open time span in epoch milliseconds. */
export type Interval = { start: number; end: number }

const MINUTE_MS = 60_000

/** Brussels offset (in minutes) that applies at the given instant. */
const offsetMinutes = (instant: number): number => {
  const name = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    timeZoneName: 'longOffset',
  })
    .formatToParts(new Date(instant))
    .find(part => part.type === 'timeZoneName')?.value
  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(name ?? '')
  if (!match) return 0
  const minutes = Number(match[2]) * 60 + Number(match[3])
  return match[1] === '-' ? -minutes : minutes
}

/** The instant at which the Brussels wall clock shows `date` `hour`:00. */
export const brusselsInstant = (date: string, hour: number): number => {
  const asUtc = Date.parse(`${date}T${String(hour).padStart(2, '0')}:00:00Z`)
  const guess = asUtc - offsetMinutes(asUtc) * MINUTE_MS
  // Re-check the offset at the guess, so days where the clocks change stay right.
  return asUtc - offsetMinutes(guess) * MINUTE_MS
}

/** The waking hours of a calendar day in Brussels, e.g. 08:00 to 20:00. */
export const wakingWindow = (
  date: string,
  fromHour: number,
  toHour: number
): Interval => ({
  start: brusselsInstant(date, fromHour),
  end: brusselsInstant(date, toHour),
})

/** Sorts spans and joins the ones that overlap or touch (back-to-back). */
export const mergeIntervals = (intervals: Interval[]): Interval[] => {
  const sorted = intervals
    .filter(({ start, end }) => end > start)
    .sort((a, b) => a.start - b.start)
  const merged: Interval[] = []
  for (const interval of sorted) {
    const last = merged.at(-1)
    if (last && interval.start <= last.end) {
      last.end = Math.max(last.end, interval.end)
    } else {
      merged.push({ ...interval })
    }
  }
  return merged
}

/**
 * The gaps of `window` that no `busy` span covers and that last at least
 * `minMinutes`. Busy spans may be unsorted, overlapping, or reach outside the
 * window (they are clipped).
 */
export const freeSlots = (
  window: Interval,
  busy: Interval[],
  minMinutes: number
): Interval[] => {
  const slots: Interval[] = []
  let cursor = window.start
  for (const span of mergeIntervals(busy)) {
    if (span.end <= window.start) continue
    if (span.start >= window.end) break
    if (span.start > cursor) slots.push({ start: cursor, end: span.start })
    cursor = Math.max(cursor, span.end)
  }
  if (cursor < window.end) slots.push({ start: cursor, end: window.end })
  return slots.filter(slot => slot.end - slot.start >= minMinutes * MINUTE_MS)
}

/** Parses an ISO 8601 item into a span. Returns undefined for unusable times. */
export const toInterval = (
  startTime: string,
  endTime: string
): Interval | undefined => {
  const start = Date.parse(startTime)
  const end = Date.parse(endTime)
  return Number.isNaN(start) || Number.isNaN(end) || end <= start
    ? undefined
    : { start, end }
}

/** ISO 8601 with the Brussels offset, e.g. 2026-11-17T12:00:00+01:00. */
export const formatBrussels = (instant: number): string => {
  const offset = offsetMinutes(instant)
  const local = new Date(instant + offset * MINUTE_MS)
    .toISOString()
    .slice(0, 19)
  const sign = offset < 0 ? '-' : '+'
  const hh = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0')
  const mm = String(Math.abs(offset) % 60).padStart(2, '0')
  return `${local}${sign}${hh}:${mm}`
}
