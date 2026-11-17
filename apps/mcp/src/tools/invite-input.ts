import type { QuivrClient } from '../quivr/quivr-client.js'
import { formatBrussels } from './free-slots.js'

const parseTime = (label: string, value: string): number => {
  const time = Date.parse(value)
  if (Number.isNaN(time)) {
    throw new Error(
      `${label} must be an ISO 8601 date and time, e.g. 2026-11-17T14:00:00+01:00`
    )
  }
  return time
}

/** Checks start < end and returns both as Brussels ISO 8601 times. */
export const parseInviteTimes = (start: string, end: string) => {
  const startTime = parseTime('start', start)
  const endTime = parseTime('end', end)
  if (startTime >= endTime) throw new Error('start must be before end.')
  return { start: formatBrussels(startTime), end: formatBrussels(endTime) }
}

/** Checks every id is one of the student's friends and adds the first names. */
export const resolveFriends = async (
  friendIds: string[],
  quivr: QuivrClient
) => {
  const ids = [...new Set(friendIds)]
  const { friendList } = await quivr.getFriends()
  const unknown = ids.filter(id => !friendList.some(f => f.id === id))
  if (unknown.length > 0) {
    throw new Error(
      `Unknown friend id(s): ${unknown.join(', ')}. Use get_friends to find the ids.`
    )
  }
  return ids.map(id => ({
    id,
    firstName: friendList.find(f => f.id === id)?.firstName ?? id,
  }))
}
