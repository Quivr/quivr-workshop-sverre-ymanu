import { describe, expect, it } from 'vitest'

import {
  DUNGEON_KEY,
  loadDungeonMode,
  parseDungeonMode,
  saveDungeonMode,
} from './dungeonMode'

const memoryStorage = (initial?: string) => {
  const data = new Map<string, string>()
  if (initial !== undefined) data.set(DUNGEON_KEY, initial)
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  }
}

describe('parseDungeonMode', () => {
  it('is on by default', () => {
    expect(parseDungeonMode(null)).toBe(true)
  })

  it('reads the saved choice', () => {
    expect(parseDungeonMode('on')).toBe(true)
    expect(parseDungeonMode('off')).toBe(false)
  })

  it.each(['', 'ON', 'false', '0', '{"on":false}', 'null'])(
    'falls back to on for %j',
    raw => {
      expect(parseDungeonMode(raw)).toBe(true)
    }
  )
})

describe('loadDungeonMode / saveDungeonMode', () => {
  it('has a versioned key', () => {
    expect(DUNGEON_KEY).toMatch(/-v\d+$/)
  })

  it('round-trips', () => {
    const storage = memoryStorage()
    saveDungeonMode(storage, false)
    expect(loadDungeonMode(storage)).toBe(false)
    saveDungeonMode(storage, true)
    expect(loadDungeonMode(storage)).toBe(true)
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
    expect(loadDungeonMode(blocked)).toBe(true)
    expect(() => saveDungeonMode(blocked, false)).not.toThrow()
  })
})
