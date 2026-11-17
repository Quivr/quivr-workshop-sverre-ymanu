import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('./config.js', () => ({
  config: {
    allowedModels: ['anthropic:claude-haiku-5-5', 'openai:gpt-test'],
    defaultModel: 'anthropic:claude-haiku-5-5',
  },
}))

const { languageModel, resolveModel } = await import('./models.js')

afterEach(() => vi.unstubAllEnvs())

describe('resolveModel', () => {
  it('resolves an allowed anthropic model', () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key')
    const { id, model } = resolveModel('anthropic:claude-haiku-5-5')
    expect(id).toBe('anthropic:claude-haiku-5-5')
    expect(model).toMatchObject({ provider: 'anthropic.messages' })
  })

  it('falls back to the default model', () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key')
    expect(resolveModel().id).toBe('anthropic:claude-haiku-5-5')
  })

  it('resolves an allowed openai model when the key is set', () => {
    vi.stubEnv('OPENAI_API_KEY', 'test-key')
    const { model } = resolveModel('openai:gpt-test')
    expect(model).toMatchObject({ modelId: 'gpt-test' })
  })

  it('fails clearly for an openai model without OPENAI_API_KEY', () => {
    vi.stubEnv('OPENAI_API_KEY', '')
    expect(() => resolveModel('openai:gpt-test')).toThrow(/OPENAI_API_KEY/)
  })

  it('rejects a model that is not in the allow-list', () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key')
    expect(() => resolveModel('anthropic:claude-sonnet-5-5')).toThrow(
      /not allowed/
    )
  })
})

describe('languageModel', () => {
  it('rejects an unknown provider', () => {
    expect(() => languageModel('mistral:large')).toThrow(/Unknown provider/)
  })

  it('skips the allow-list (used by the judge)', () => {
    vi.stubEnv('OPENAI_API_KEY', 'test-key')
    expect(languageModel('openai:gpt-other')).toMatchObject({
      modelId: 'gpt-other',
    })
  })
})
