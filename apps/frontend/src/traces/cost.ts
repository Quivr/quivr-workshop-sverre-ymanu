import type { Usage } from './types'

/**
 * ESTIMATED list prices in USD per million tokens (base tier; Haiku costs more
 * above 100k tokens of context, and cached tokens are not modelled). Update
 * when prices change.
 * A model that is not listed gets no cost.
 */
const PRICES_PER_MILLION_TOKENS: Record<
  string,
  { input: number; output: number }
> = {
  'anthropic:claude-haiku-5-5': { input: 0.1, output: 0.5 },
  'anthropic:claude-sonnet-5-5': { input: 2, output: 10 },
}

/** Estimated cost in USD, or undefined when the model or usage is unknown. */
export const estimateCost = (
  model: string,
  usage: Usage | undefined
): number | undefined => {
  const price = PRICES_PER_MILLION_TOKENS[model]
  if (!price || !usage) return undefined
  if (usage.inputTokens === undefined && usage.outputTokens === undefined)
    return undefined
  return (
    ((usage.inputTokens ?? 0) * price.input +
      (usage.outputTokens ?? 0) * price.output) /
    1_000_000
  )
}

export const formatCost = (cost: number | undefined) => {
  if (cost === undefined) return 'n/a'
  return `~$${cost < 0.01 ? cost.toFixed(5) : cost.toFixed(3)}`
}
