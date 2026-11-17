import { describe, expect, it } from 'vitest'

import { confettiPieces } from './confetti'

describe('confettiPieces', () => {
  it('makes the requested number of pieces', () => {
    expect(confettiPieces(36, 5)).toHaveLength(36)
  })

  it('keeps every value in range, also at the edges of the random range', () => {
    for (const value of [0, 0.5, 0.999999]) {
      for (const piece of confettiPieces(3, 5, () => value)) {
        expect(piece.left).toBeGreaterThanOrEqual(0)
        expect(piece.left).toBeLessThanOrEqual(100)
        expect(piece.colour).toBeGreaterThanOrEqual(0)
        expect(piece.colour).toBeLessThan(5)
        expect(piece.durationMs).toBeLessThanOrEqual(3000)
        expect(piece.delayMs).toBeLessThanOrEqual(600)
      }
    }
  })
})
