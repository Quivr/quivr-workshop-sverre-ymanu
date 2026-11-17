import { describe, expect, it } from 'vitest'

import { parseCommand } from './commands'

describe('parseCommand', () => {
  it('summons one by default', () => {
    expect(parseCommand('/summon')).toEqual({ name: 'summon', count: 1 })
  })

  it('summons the given number, with no upper limit', () => {
    expect(parseCommand('/summon 25')).toEqual({ name: 'summon', count: 25 })
    expect(parseCommand('/summon 100000')).toEqual({
      name: 'summon',
      count: 100000,
    })
  })

  it('ignores case, surrounding and extra spaces', () => {
    expect(parseCommand('  /SUMMON   3 ')).toEqual({ name: 'summon', count: 3 })
  })

  it('leaves everything else to the assistant', () => {
    expect(parseCommand('summon')).toBeNull()
    expect(parseCommand('/summon lots')).toBeNull()
    expect(parseCommand('/summon -2')).toBeNull()
    expect(parseCommand('/summon 2 please')).toBeNull()
    expect(parseCommand('please /summon 2')).toBeNull()
    expect(parseCommand("What's on the menu?")).toBeNull()
  })
})
