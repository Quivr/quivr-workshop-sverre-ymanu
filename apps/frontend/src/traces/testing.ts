import type { Trace } from './types'

/** Builds a minimal fake run for the unit tests. */
export const fakeTrace = (overrides: Partial<Trace> = {}): Trace => ({
  id: 'trace-1',
  startedAt: '2026-01-01T12:00:00.000Z',
  model: 'anthropic:claude-haiku-5-5',
  messages: [{ role: 'user', content: 'What is for lunch?' }],
  toolCalls: [],
  text: '',
  durationMs: 1000,
  ...overrides,
})
