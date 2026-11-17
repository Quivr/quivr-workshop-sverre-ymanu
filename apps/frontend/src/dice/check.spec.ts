import { describe, expect, it } from 'vitest'

import {
  DEFAULT_DC,
  FAILURE_LINES,
  SUCCESS_LINES,
  describeCheck,
  nextMode,
  pickFailureLine,
  pickSuccessLine,
  rollCheck,
  type CheckResult,
  type RollMode,
} from './check'

/** A rng that gives the die faces in order: the face n comes from (n - 1) / 20 + a little. */
const dice = (...faces: number[]) => {
  const queue = [...faces]
  return () => {
    const face = queue.shift()
    if (face === undefined) throw new Error('rolled more dice than expected')
    return (face - 0.5) / 20
  }
}

const result = (overrides: Partial<CheckResult> = {}): CheckResult => ({
  rolls: [10],
  kept: 10,
  success: true,
  critical: null,
  mode: 'normal',
  ...overrides,
})

describe('DEFAULT_DC', () => {
  it('is 8: about 65% of d20 rolls succeed', () => {
    expect(DEFAULT_DC).toBe(8)
    let passes = 0
    for (let face = 1; face <= 20; face++)
      if (rollCheck({ random: dice(face) }).success) passes++
    expect(passes / 20).toBe(0.65)
  })
})

describe('rollCheck', () => {
  it('throws one die in normal mode and keeps it', () => {
    expect(rollCheck({ random: dice(14), dc: 8, mode: 'normal' })).toEqual({
      rolls: [14],
      kept: 14,
      success: true,
      critical: null,
      mode: 'normal',
    })
  })

  it('maps the edges of the rng to a natural 1 and a natural 20', () => {
    expect(rollCheck({ random: () => 0 }).kept).toBe(1)
    expect(rollCheck({ random: () => 0.999999 }).kept).toBe(20)
  })

  it('succeeds at the DC and fails just under it (7 / 8 / 9 against DC 8)', () => {
    expect(rollCheck({ random: dice(7), dc: 8 }).success).toBe(false)
    expect(rollCheck({ random: dice(8), dc: 8 }).success).toBe(true)
    expect(rollCheck({ random: dice(9), dc: 8 }).success).toBe(true)
  })

  it('uses DEFAULT_DC and the normal mode when only the rng is given', () => {
    const low = rollCheck({ random: dice(DEFAULT_DC - 1) })
    const high = rollCheck({ random: dice(DEFAULT_DC) })
    expect([low.success, high.success, low.mode]).toEqual([
      false,
      true,
      'normal',
    ])
  })

  it('adds the modifier to the roll', () => {
    expect(rollCheck({ random: dice(6), dc: 8, modifier: 2 }).success).toBe(
      true
    )
    expect(rollCheck({ random: dice(6), dc: 8, modifier: 1 }).success).toBe(
      false
    )
  })

  it('always fails a natural 1, even against DC 1 or with a big modifier', () => {
    const check = rollCheck({ random: dice(1), dc: 1, modifier: 10 })
    expect(check).toMatchObject({ success: false, critical: 'fail', kept: 1 })
  })

  it('always succeeds a natural 20, even against an impossible DC', () => {
    const check = rollCheck({ random: dice(20), dc: 99, modifier: -10 })
    expect(check).toMatchObject({
      success: true,
      critical: 'success',
      kept: 20,
    })
  })

  it('does not call a 19 or a 2 critical', () => {
    expect(rollCheck({ random: dice(19) }).critical).toBeNull()
    expect(rollCheck({ random: dice(2) }).critical).toBeNull()
  })

  it('advantage throws two dice and keeps the higher', () => {
    const check = rollCheck({ random: dice(3, 17), mode: 'advantage' })
    expect(check).toMatchObject({ rolls: [3, 17], kept: 17, success: true })
    expect(rollCheck({ random: dice(17, 3), mode: 'advantage' }).kept).toBe(17)
  })

  it('disadvantage throws two dice and keeps the lower', () => {
    const check = rollCheck({ random: dice(17, 9), mode: 'disadvantage' })
    expect(check).toMatchObject({ rolls: [17, 9], kept: 9, success: true })
    expect(rollCheck({ random: dice(9, 17), mode: 'disadvantage' }).kept).toBe(
      9
    )
    expect(
      rollCheck({ random: dice(17, 5), mode: 'disadvantage' }).success
    ).toBe(false)
  })

  it('judges the natural of the kept die only', () => {
    expect(rollCheck({ random: dice(20, 1), mode: 'advantage' })).toMatchObject(
      {
        kept: 20,
        critical: 'success',
      }
    )
    expect(
      rollCheck({ random: dice(20, 1), mode: 'disadvantage' })
    ).toMatchObject({ kept: 1, critical: 'fail', success: false })
    expect(rollCheck({ random: dice(1, 5), mode: 'advantage' })).toMatchObject({
      kept: 5,
      critical: null,
      success: false,
    })
    expect(
      rollCheck({ random: dice(20, 15), mode: 'disadvantage' })
    ).toMatchObject({
      kept: 15,
      critical: null,
      success: true,
    })
  })

  it('reports the mode it was rolled with', () => {
    for (const mode of ['normal', 'advantage', 'disadvantage'] as RollMode[])
      expect(rollCheck({ mode }).mode).toBe(mode)
  })

  it('uses Math.random by default and stays on the die', () => {
    for (let i = 0; i < 200; i++) {
      const { kept } = rollCheck({ mode: 'advantage' })
      expect(kept).toBeGreaterThanOrEqual(1)
      expect(kept).toBeLessThanOrEqual(20)
    }
  })
})

describe('nextMode', () => {
  it('a natural 20 earns advantage', () => {
    expect(nextMode(result({ kept: 20, critical: 'success' }))).toBe(
      'advantage'
    )
  })

  it('a natural 1 earns disadvantage', () => {
    expect(
      nextMode(result({ kept: 1, critical: 'fail', success: false }))
    ).toBe('disadvantage')
  })

  it.each([true, false])(
    'anything else goes back to normal (success: %s)',
    success => {
      for (const mode of ['normal', 'advantage', 'disadvantage'] as RollMode[])
        expect(nextMode(result({ success, mode }))).toBe('normal')
    }
  )

  it('advantage and disadvantage last for exactly one check', () => {
    // nat 20 -> advantage check (14, no crit) -> normal check
    const first = rollCheck({ random: dice(20), mode: 'normal' })
    const second = rollCheck({ random: dice(14, 6), mode: nextMode(first) })
    expect(second.mode).toBe('advantage')
    expect(nextMode(second)).toBe('normal')

    const third = rollCheck({ random: dice(1), mode: 'normal' })
    const fourth = rollCheck({ random: dice(12, 4), mode: nextMode(third) })
    expect(fourth.mode).toBe('disadvantage')
    expect(nextMode(fourth)).toBe('normal')
  })

  it('a new crit during advantage starts the next streak', () => {
    const check = rollCheck({ random: dice(4, 20), mode: 'advantage' })
    expect(nextMode(check)).toBe('advantage')
  })
})

describe('flavour lines', () => {
  it('has a small pool of each', () => {
    expect(FAILURE_LINES).toHaveLength(8)
    expect(SUCCESS_LINES).toHaveLength(6)
  })

  it('has only real, distinct, short lines', () => {
    for (const lines of [FAILURE_LINES, SUCCESS_LINES]) {
      expect(new Set(lines).size).toBe(lines.length)
      for (const line of lines) {
        expect(line.trim()).not.toBe('')
        expect(line.length).toBeLessThan(90)
      }
    }
  })

  it('has no hard-coded user data', () => {
    const all = [...FAILURE_LINES, ...SUCCESS_LINES].join('\n')
    expect(all).not.toMatch(/@|https?:\/\/|\d{4}/)
  })

  it('picks the first line at the bottom of the range and the last at the top', () => {
    expect(pickFailureLine(() => 0)).toBe(FAILURE_LINES[0])
    expect(pickFailureLine(() => 0.999999)).toBe(FAILURE_LINES.at(-1))
    expect(pickSuccessLine(() => 0)).toBe(SUCCESS_LINES[0])
    expect(pickSuccessLine(() => 0.999999)).toBe(SUCCESS_LINES.at(-1))
  })

  it('stays in range for out-of-range rng values', () => {
    expect(pickFailureLine(() => 1)).toBe(FAILURE_LINES.at(-1))
    expect(pickSuccessLine(() => -0.5)).toBe(SUCCESS_LINES[0])
  })

  it('can reach every line', () => {
    const reachable = (
      lines: readonly string[],
      pick: (r: () => number) => string
    ) => new Set(lines.map((_, i) => pick(() => (i + 0.5) / lines.length)))
    expect(reachable(FAILURE_LINES, pickFailureLine).size).toBe(
      FAILURE_LINES.length
    )
    expect(reachable(SUCCESS_LINES, pickSuccessLine).size).toBe(
      SUCCESS_LINES.length
    )
  })
})

describe('describeCheck', () => {
  it('reads out the roll, the DC and the result', () => {
    expect(describeCheck(result({ rolls: [14], kept: 14 }), 8)).toBe(
      'Rolled 14 against DC 8: success.'
    )
    expect(
      describeCheck(result({ rolls: [5], kept: 5, success: false }), 8)
    ).toBe('Rolled 5 against DC 8: failure.')
  })

  it('mentions both dice and the mode', () => {
    expect(
      describeCheck(result({ rolls: [3, 17], kept: 17, mode: 'advantage' }), 8)
    ).toBe('Rolled 3 and 17, kept 17 with advantage against DC 8: success.')
  })

  it('announces the natural 20 and the natural 1', () => {
    expect(
      describeCheck(result({ rolls: [20], kept: 20, critical: 'success' }))
    ).toContain('Inspiration'.toLowerCase())
    expect(
      describeCheck(
        result({ rolls: [1], kept: 1, success: false, critical: 'fail' })
      )
    ).toContain('disadvantage')
  })
})
