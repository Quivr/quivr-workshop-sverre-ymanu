import { describe, expect, it } from 'vitest'

import {
  freeSeats,
  levelFor,
  parseLibraries,
  sortLeastBusy,
} from './library-occupancy'

describe('levelFor', () => {
  it('colour-codes by threshold', () => {
    expect(levelFor(0)).toBe('low')
    expect(levelFor(49)).toBe('low')
    expect(levelFor(50)).toBe('medium')
    expect(levelFor(79)).toBe('medium')
    expect(levelFor(80)).toBe('high')
    expect(levelFor(120)).toBe('high')
  })
})

describe('parseLibraries', () => {
  it('returns nothing for malformed input', () => {
    expect(parseLibraries(undefined)).toEqual([])
    expect(parseLibraries('oops')).toEqual([])
    expect(parseLibraries({ name: 'Agora' })).toEqual([])
    expect(parseLibraries([null, 3, {}, { name: 5 }])).toEqual([])
  })

  it('keeps valid fields and drops invalid ones', () => {
    expect(
      parseLibraries([{ name: 'Agora', percentFull: '25', capacity: 600 }])
    ).toEqual([expect.objectContaining({ name: 'Agora', capacity: 600 })])
    expect(parseLibraries([{ name: 'Agora', percentFull: '25' }])[0]).toEqual(
      expect.objectContaining({ percentFull: undefined })
    )
  })
})

describe('freeSeats', () => {
  it('needs both occupancy and capacity and never goes negative', () => {
    expect(freeSeats({ name: 'A', occupancy: 150, capacity: 600 })).toBe(450)
    expect(freeSeats({ name: 'A', occupancy: 700, capacity: 600 })).toBe(0)
    expect(freeSeats({ name: 'A', occupancy: 5 })).toBeUndefined()
  })
})

describe('sortLeastBusy', () => {
  it('sorts by percentFull and puts libraries without data last', () => {
    const sorted = sortLeastBusy([
      { name: 'No sensor' },
      { name: 'Busy', percentFull: 90 },
      { name: 'Quiet', percentFull: 10 },
    ])
    expect(sorted.map(l => l.name)).toEqual(['Quiet', 'Busy', 'No sensor'])
  })
})
