import { describe, expect, it } from 'vitest'

import { generateAd, nextGapMs, pickPosition, type Rng } from './popupAds'

/** Small deterministic generator (mulberry32), so failures are reproducible. */
const seeded =
  (seed: number): Rng =>
  () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

describe('nextGapMs', () => {
  it('stays within 2 to 5 seconds', () => {
    expect(nextGapMs(0)).toBe(2_000)
    expect(nextGapMs(0.999999)).toBeLessThan(5_000)
  })
})

describe('generateAd', () => {
  const ads = Array.from({ length: 200 }, (_, i) => generateAd(seeded(i)))

  it('only uses the reserved .invalid TLD', () => {
    for (const ad of ads) expect(ad.site).toMatch(/^[a-z0-9-]+\.invalid$/)
  })

  it('has no unfilled placeholders or undefined text', () => {
    for (const ad of ads)
      for (const text of [ad.kicker, ad.headline, ad.body, ad.decline])
        expect(text).not.toMatch(/undefined|NaN|\{|\}/)
  })

  it('is different every time', () => {
    expect(new Set(ads.map(ad => ad.headline)).size).toBeGreaterThan(100)
    expect(new Set(ads.map(ad => ad.site)).size).toBeGreaterThan(150)
  })

  it('survives the extremes of the random generator', () => {
    for (const value of [0, 0.999999, 1]) {
      const ad = generateAd(() => value)
      expect(ad.headline).not.toMatch(/undefined|NaN/)
      expect(ad.palette.frame).toBeTruthy()
    }
  })

  it('keeps the tilt slight', () => {
    for (const ad of ads) expect(Math.abs(ad.tilt)).toBeLessThanOrEqual(3)
  })
})

describe('pickPosition', () => {
  it('maps random values to percentages and clamps out-of-range input', () => {
    expect(pickPosition(0.25, 0.5)).toEqual({ x: 25, y: 50 })
    expect(pickPosition(-1, 2)).toEqual({ x: 0, y: 100 })
  })
})
