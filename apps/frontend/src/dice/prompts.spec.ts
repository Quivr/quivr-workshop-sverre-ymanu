import { describe, expect, it } from 'vitest'

import { DICE_PROMPTS, formatRollMessage, promptForRoll } from './prompts'

describe('DICE_PROMPTS', () => {
  it('has exactly 20 distinct, short prompts', () => {
    expect(DICE_PROMPTS).toHaveLength(20)
    expect(new Set(DICE_PROMPTS).size).toBe(20)
    for (const prompt of DICE_PROMPTS) {
      expect(prompt.trim()).toBe(prompt)
      expect(prompt.length).toBeGreaterThan(10)
      expect(prompt.length).toBeLessThanOrEqual(120)
    }
  })

  it('never asks the assistant to send, create, book or invite', () => {
    for (const prompt of DICE_PROMPTS) {
      expect(prompt).not.toMatch(
        /\b(send|invite|book|reserve|create|register|buy|order|message)\b/i
      )
    }
  })

  it('maps every roll 1..20 to a prompt', () => {
    for (let roll = 1; roll <= 20; roll++) {
      expect(promptForRoll(roll)).toBe(DICE_PROMPTS[roll - 1])
    }
  })

  it('rejects rolls outside 1..20', () => {
    expect(() => promptForRoll(0)).toThrow(RangeError)
    expect(() => promptForRoll(21)).toThrow(RangeError)
    expect(() => promptForRoll(1.5)).toThrow(RangeError)
  })

  it('keeps the special rolls special', () => {
    expect(promptForRoll(1)).toMatch(/critical fail/i)
    expect(promptForRoll(20)).toMatch(/jackpot/i)
  })
})

describe('formatRollMessage', () => {
  it('prefixes the die and the number', () => {
    expect(formatRollMessage(17)).toBe(`🎲 17: ${DICE_PROMPTS[16]}`)
    expect(formatRollMessage(1)).toBe(`🎲 1: ${DICE_PROMPTS[0]}`)
  })
})
