import { describe, expect, it } from 'vitest'

import { gateSend } from './gate'

const base = {
  dungeonMode: true,
  isRunning: false,
  isRolling: false,
  text: 'What is for lunch?',
}

describe('gateSend', () => {
  it('rolls a check first in Dungeon mode', () => {
    expect(gateSend(base)).toBe('roll')
  })

  it('sends straight away when Dungeon mode is off', () => {
    expect(gateSend({ ...base, dungeonMode: false })).toBe('send')
  })

  it.each([
    ['the agent is running', { isRunning: true }],
    ['a check is rolling', { isRolling: true }],
    ['sending is disabled', { isDisabled: true }],
  ])('ignores the press while %s, in both modes', (_name, blocked) => {
    expect(gateSend({ ...base, ...blocked })).toBe('ignore')
    expect(gateSend({ ...base, ...blocked, dungeonMode: false })).toBe('ignore')
  })

  it.each(['', '   ', '\n\t'])('ignores empty text %j', text => {
    expect(gateSend({ ...base, text })).toBe('ignore')
    expect(gateSend({ ...base, dungeonMode: false, text })).toBe('ignore')
  })
})
