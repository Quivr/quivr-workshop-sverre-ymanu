import { describe, expect, it } from 'vitest'

import {
  brusselsInstant,
  formatBrussels,
  freeSlots,
  mergeIntervals,
  toInterval,
  wakingWindow,
  type Interval,
} from './free-slots.js'

const at = (iso: string) => Date.parse(iso)
const span = (start: string, end: string): Interval => ({
  start: at(start),
  end: at(end),
})
const show = (slots: Interval[]) =>
  slots.map(slot => [formatBrussels(slot.start), formatBrussels(slot.end)])

const winter = wakingWindow('2026-11-17', 8, 20)

describe('wakingWindow', () => {
  it('uses +01:00 in winter', () => {
    expect(formatBrussels(winter.start)).toBe('2026-11-17T08:00:00+01:00')
    expect(formatBrussels(winter.end)).toBe('2026-11-17T20:00:00+01:00')
  })

  it('uses +02:00 in summer', () => {
    const summer = wakingWindow('2026-07-01', 8, 20)
    expect(formatBrussels(summer.start)).toBe('2026-07-01T08:00:00+02:00')
    expect(summer.start).toBe(at('2026-07-01T06:00:00Z'))
  })

  it('is right on the day the clocks go forward (2026-03-29)', () => {
    expect(brusselsInstant('2026-03-29', 8)).toBe(at('2026-03-29T06:00:00Z'))
    expect(brusselsInstant('2026-03-28', 8)).toBe(at('2026-03-28T07:00:00Z'))
    expect(wakingWindow('2026-03-29', 8, 20).end).toBe(
      at('2026-03-29T18:00:00Z')
    )
  })

  it('is right on the day the clocks go back (2026-10-25)', () => {
    expect(brusselsInstant('2026-10-25', 8)).toBe(at('2026-10-25T07:00:00Z'))
    expect(wakingWindow('2026-10-25', 8, 20).end).toBe(
      at('2026-10-25T19:00:00Z')
    )
  })

  it('is 12 hours long on a normal day', () => {
    expect(winter.end - winter.start).toBe(12 * 60 * 60_000)
  })
})

describe('mergeIntervals', () => {
  it('merges overlapping and touching spans', () => {
    const merged = mergeIntervals([
      span('2026-11-17T10:00:00Z', '2026-11-17T11:00:00Z'),
      span('2026-11-17T08:00:00Z', '2026-11-17T09:00:00Z'),
      span('2026-11-17T09:00:00Z', '2026-11-17T09:30:00Z'),
      span('2026-11-17T10:30:00Z', '2026-11-17T12:00:00Z'),
    ])
    expect(merged).toEqual([
      span('2026-11-17T08:00:00Z', '2026-11-17T09:30:00Z'),
      span('2026-11-17T10:00:00Z', '2026-11-17T12:00:00Z'),
    ])
  })

  it('drops empty and reversed spans and does not mutate its input', () => {
    const input = [
      span('2026-11-17T09:00:00Z', '2026-11-17T09:00:00Z'),
      span('2026-11-17T10:00:00Z', '2026-11-17T09:00:00Z'),
      span('2026-11-17T08:00:00Z', '2026-11-17T08:30:00Z'),
    ]
    const copy = structuredClone(input)
    expect(mergeIntervals(input)).toHaveLength(1)
    expect(input).toEqual(copy)
  })

  it('keeps a span that contains another one', () => {
    expect(
      mergeIntervals([
        span('2026-11-17T08:00:00Z', '2026-11-17T12:00:00Z'),
        span('2026-11-17T09:00:00Z', '2026-11-17T10:00:00Z'),
      ])
    ).toEqual([span('2026-11-17T08:00:00Z', '2026-11-17T12:00:00Z')])
  })
})

describe('freeSlots', () => {
  it('returns the whole window for an empty day', () => {
    expect(show(freeSlots(winter, [], 30))).toEqual([
      ['2026-11-17T08:00:00+01:00', '2026-11-17T20:00:00+01:00'],
    ])
  })

  it('returns the gaps between classes', () => {
    const busy = [
      span('2026-11-17T09:00:00+01:00', '2026-11-17T11:00:00+01:00'),
      span('2026-11-17T13:00:00+01:00', '2026-11-17T15:00:00+01:00'),
    ]
    expect(show(freeSlots(winter, busy, 30))).toEqual([
      ['2026-11-17T08:00:00+01:00', '2026-11-17T09:00:00+01:00'],
      ['2026-11-17T11:00:00+01:00', '2026-11-17T13:00:00+01:00'],
      ['2026-11-17T15:00:00+01:00', '2026-11-17T20:00:00+01:00'],
    ])
  })

  it('combines overlapping busy spans from several people', () => {
    const busy = [
      span('2026-11-17T09:00:00+01:00', '2026-11-17T12:00:00+01:00'),
      span('2026-11-17T10:00:00+01:00', '2026-11-17T13:00:00+01:00'),
      span('2026-11-17T11:00:00+01:00', '2026-11-17T11:30:00+01:00'),
    ]
    expect(show(freeSlots(winter, busy, 30))).toEqual([
      ['2026-11-17T08:00:00+01:00', '2026-11-17T09:00:00+01:00'],
      ['2026-11-17T13:00:00+01:00', '2026-11-17T20:00:00+01:00'],
    ])
  })

  it('leaves no gap between back-to-back items', () => {
    const busy = [
      span('2026-11-17T08:00:00+01:00', '2026-11-17T10:00:00+01:00'),
      span('2026-11-17T10:00:00+01:00', '2026-11-17T12:00:00+01:00'),
    ]
    expect(show(freeSlots(winter, busy, 1))).toEqual([
      ['2026-11-17T12:00:00+01:00', '2026-11-17T20:00:00+01:00'],
    ])
  })

  it('skips gaps shorter than the minimum, keeps ones that match exactly', () => {
    const busy = [
      span('2026-11-17T08:00:00+01:00', '2026-11-17T09:00:00+01:00'),
      span('2026-11-17T09:20:00+01:00', '2026-11-17T09:30:00+01:00'),
      span('2026-11-17T10:00:00+01:00', '2026-11-17T20:00:00+01:00'),
    ]
    expect(show(freeSlots(winter, busy, 30))).toEqual([
      ['2026-11-17T09:30:00+01:00', '2026-11-17T10:00:00+01:00'],
    ])
    expect(freeSlots(winter, busy, 31)).toEqual([])
  })

  it('returns nothing when an item covers the whole window', () => {
    const busy = [
      span('2026-11-17T00:00:00+01:00', '2026-11-17T23:59:59+01:00'),
    ]
    expect(freeSlots(winter, busy, 5)).toEqual([])
  })

  it('clips items that start the evening before or end after midnight', () => {
    const busy = [
      span('2026-11-16T22:00:00+01:00', '2026-11-17T09:00:00+01:00'),
      span('2026-11-17T19:00:00+01:00', '2026-11-18T02:00:00+01:00'),
    ]
    expect(show(freeSlots(winter, busy, 30))).toEqual([
      ['2026-11-17T09:00:00+01:00', '2026-11-17T19:00:00+01:00'],
    ])
  })

  it('ignores items outside the window', () => {
    const busy = [
      span('2026-11-17T06:00:00+01:00', '2026-11-17T08:00:00+01:00'),
      span('2026-11-17T20:00:00+01:00', '2026-11-17T22:00:00+01:00'),
      span('2026-11-16T10:00:00+01:00', '2026-11-16T12:00:00+01:00'),
    ]
    expect(show(freeSlots(winter, busy, 30))).toEqual([
      ['2026-11-17T08:00:00+01:00', '2026-11-17T20:00:00+01:00'],
    ])
  })

  it('works with offsets other than Brussels (same instants)', () => {
    const busy = [span('2026-11-17T08:00:00Z', '2026-11-17T10:00:00Z')]
    expect(show(freeSlots(winter, busy, 30))).toEqual([
      ['2026-11-17T08:00:00+01:00', '2026-11-17T09:00:00+01:00'],
      ['2026-11-17T11:00:00+01:00', '2026-11-17T20:00:00+01:00'],
    ])
  })

  it('counts 12 real hours on the day the clocks go back', () => {
    const day = wakingWindow('2026-10-25', 8, 20)
    const [slot] = freeSlots(day, [], 30)
    expect(slot && slot.end - slot.start).toBe(12 * 60 * 60_000)
  })
})

describe('toInterval', () => {
  it('parses ISO times with offsets', () => {
    expect(
      toInterval('2026-11-17T09:00:00+01:00', '2026-11-17T10:00:00+01:00')
    ).toEqual(span('2026-11-17T08:00:00Z', '2026-11-17T09:00:00Z'))
  })

  it('rejects invalid, empty and reversed spans', () => {
    expect(toInterval('nope', '2026-11-17T10:00:00Z')).toBeUndefined()
    expect(
      toInterval('2026-11-17T10:00:00Z', '2026-11-17T10:00:00Z')
    ).toBeUndefined()
    expect(
      toInterval('2026-11-17T11:00:00Z', '2026-11-17T10:00:00Z')
    ).toBeUndefined()
  })
})

describe('formatBrussels', () => {
  it('formats with the offset in force at that instant', () => {
    expect(formatBrussels(at('2026-07-01T10:30:00Z'))).toBe(
      '2026-07-01T12:30:00+02:00'
    )
    expect(formatBrussels(at('2026-12-01T10:30:00Z'))).toBe(
      '2026-12-01T11:30:00+01:00'
    )
  })

  it('rolls over to the next day after 23:00 UTC in winter', () => {
    expect(formatBrussels(at('2026-11-17T23:30:00Z'))).toBe(
      '2026-11-18T00:30:00+01:00'
    )
  })
})
