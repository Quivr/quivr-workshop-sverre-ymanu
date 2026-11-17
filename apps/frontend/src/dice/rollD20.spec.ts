import { describe, expect, it } from 'vitest'

import { rollD20 } from './rollD20'

/** Small seeded generator (mulberry32) so the test is repeatable. */
const seeded = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

describe('rollD20', () => {
  it('maps the edges of the random range to 1 and 20', () => {
    expect(rollD20(() => 0)).toBe(1)
    expect(rollD20(() => 0.999999)).toBe(20)
  })

  it('maps each twentieth of the range to its own roll', () => {
    for (let roll = 1; roll <= 20; roll++) {
      expect(rollD20(() => (roll - 1) / 20)).toBe(roll)
      expect(rollD20(() => (roll - 0.001) / 20)).toBe(roll)
    }
  })

  it('stays within 1..20 even when the random source misbehaves', () => {
    expect(rollD20(() => 1)).toBe(20)
    expect(rollD20(() => -0.5)).toBe(1)
  })

  it('is uniform over a seeded generator', () => {
    const random = seeded(42)
    const counts = new Array<number>(21).fill(0)
    const total = 40_000
    for (let i = 0; i < total; i++) counts[rollD20(random)]!++
    expect(counts[0]).toBe(0)
    const expected = total / 20
    for (let roll = 1; roll <= 20; roll++) {
      expect(Math.abs(counts[roll]! - expected)).toBeLessThan(expected * 0.1)
    }
  })

  it('defaults to Math.random', () => {
    const roll = rollD20()
    expect(Number.isInteger(roll)).toBe(true)
    expect(roll).toBeGreaterThanOrEqual(1)
    expect(roll).toBeLessThanOrEqual(20)
  })
})
