import { describe, expect, it } from 'vitest'

import { estimateCost, formatCost } from './cost'

describe('estimateCost', () => {
  it('prices input and output tokens per million', () => {
    const cost = estimateCost('anthropic:claude-haiku-5-5', {
      inputTokens: 1_000_000,
      outputTokens: 100_000,
    })
    expect(cost).toBeCloseTo(1.5)
  })

  it('treats a missing side as zero tokens', () => {
    expect(
      estimateCost('anthropic:claude-haiku-5-5', { inputTokens: 1_000_000 })
    ).toBeCloseTo(1)
  })

  it('returns undefined for unknown models or missing usage', () => {
    expect(
      estimateCost('other:model', { inputTokens: 10, outputTokens: 10 })
    ).toBeUndefined()
    expect(
      estimateCost('anthropic:claude-haiku-5-5', undefined)
    ).toBeUndefined()
    expect(estimateCost('anthropic:claude-haiku-5-5', {})).toBeUndefined()
  })
})

describe('formatCost', () => {
  it('marks costs as estimates and handles unknown', () => {
    expect(formatCost(undefined)).toBe('n/a')
    expect(formatCost(0.0012)).toBe('~$0.00120')
    expect(formatCost(1.5)).toBe('~$1.500')
  })
})
