import { describe, expect, it } from 'vitest'

import {
  EMPTY_STATS,
  STATS_KEY,
  formatStats,
  loadStats,
  parseStats,
  recordRoll,
  saveStats,
  serialiseStats,
} from './stats'

const memoryStorage = (initial?: string) => {
  const data = new Map<string, string>()
  if (initial !== undefined) data.set(STATS_KEY, initial)
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  }
}

describe('recordRoll', () => {
  it('counts rolls, natural 20s and natural 1s', () => {
    let stats = EMPTY_STATS
    for (const roll of [7, 20, 1, 20, 13]) stats = recordRoll(stats, roll)
    expect(stats).toEqual({ rolls: 5, nat20: 2, nat1: 1 })
  })

  it('does not change the stats it was given', () => {
    recordRoll(EMPTY_STATS, 20)
    expect(EMPTY_STATS).toEqual({ rolls: 0, nat20: 0, nat1: 0 })
  })
})

describe('parseStats', () => {
  it('round-trips through serialiseStats', () => {
    const stats = { rolls: 12, nat20: 1, nat1: 0 }
    expect(parseStats(serialiseStats(stats))).toEqual(stats)
  })

  it.each([
    ['nothing stored', null],
    ['empty string', ''],
    ['not JSON', '{oops'],
    ['JSON null', 'null'],
    ['a number', '42'],
    ['an array', '[1,2,3]'],
    ['an old version', '{"version":0,"rolls":1,"nat20":0,"nat1":0}'],
    ['no version', '{"rolls":1,"nat20":0,"nat1":0}'],
    ['a string count', '{"version":1,"rolls":"1","nat20":0,"nat1":0}'],
    ['a negative count', '{"version":1,"rolls":3,"nat20":-1,"nat1":0}'],
    ['a fractional count', '{"version":1,"rolls":3.5,"nat20":0,"nat1":0}'],
    ['a missing count', '{"version":1,"rolls":3,"nat20":0}'],
    ['more specials than rolls', '{"version":1,"rolls":1,"nat20":1,"nat1":1}'],
  ])('resets on %s', (_name, raw) => {
    expect(parseStats(raw)).toEqual(EMPTY_STATS)
  })
})

describe('loadStats / saveStats', () => {
  it('saves and loads', () => {
    const storage = memoryStorage()
    saveStats(storage, { rolls: 3, nat20: 1, nat1: 1 })
    expect(loadStats(storage)).toEqual({ rolls: 3, nat20: 1, nat1: 1 })
  })

  it('resets corrupt storage', () => {
    expect(loadStats(memoryStorage('{"version":1,"rolls":"x"}'))).toEqual(
      EMPTY_STATS
    )
  })

  it('never throws when storage is blocked', () => {
    const blocked = {
      getItem: () => {
        throw new Error('denied')
      },
      setItem: () => {
        throw new Error('full')
      },
    }
    expect(loadStats(blocked)).toEqual(EMPTY_STATS)
    expect(() => saveStats(blocked, EMPTY_STATS)).not.toThrow()
  })
})

describe('formatStats', () => {
  it('writes a compact line', () => {
    expect(formatStats({ rolls: 12, nat20: 1, nat1: 0 })).toBe(
      'Rolls 12 · 🍀 1 · 💀 0'
    )
  })
})
