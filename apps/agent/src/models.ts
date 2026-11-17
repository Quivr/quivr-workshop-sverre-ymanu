import { anthropic } from '@ai-sdk/anthropic'
import { openai } from '@ai-sdk/openai'
import { createProviderRegistry, type LanguageModel } from 'ai'

import { config } from './config.js'

/**
 * The only file that knows about LLM providers.
 * To add one: `yarn workspace agent add @ai-sdk/<provider>`, import it, add it
 * to `registry` and `apiKeys` below, then add e.g. `<provider>:<model>` to
 * ALLOWED_MODELS in .env.
 */
export const registry = createProviderRegistry({
  anthropic,
  openai,
})

/** The env var each provider needs, so a missing key fails early and clearly. */
export const apiKeys: Record<string, string> = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
}

type ModelId = Parameters<typeof registry.languageModel>[0]

/** Any registered model, without the allow-list check (used by the judge). */
export const languageModel = (id: string): LanguageModel => {
  const provider = id.split(':')[0] ?? ''
  const apiKey = apiKeys[provider]
  if (!apiKey) {
    throw new Error(
      `Unknown provider "${provider}" in model "${id}". Known: ${Object.keys(apiKeys).join(', ')}`
    )
  }
  if (!process.env[apiKey]) {
    throw new Error(
      `Model "${id}" needs ${apiKey}, but it is not set. Add it to .env, or pick another model.`
    )
  }
  return registry.languageModel(id as ModelId)
}

/** A chat model from the allow-list, or the default one. */
export const resolveModel = (requested?: string) => {
  const id = requested || config.defaultModel
  if (!config.allowedModels.includes(id)) {
    throw new Error(
      `Model "${id}" is not allowed. Allowed: ${config.allowedModels.join(', ')}`
    )
  }
  return { id, model: languageModel(id) }
}
