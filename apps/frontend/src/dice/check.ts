import { rollD20 } from './rollD20'

/** Difficulty class of every check: roll at least this (d20 + modifier) to send the prompt. About 65% success. */
export const DEFAULT_DC = 8
export const CHECK_MODIFIER = 0

export type RollMode = 'normal' | 'advantage' | 'disadvantage'
export type Critical = 'success' | 'fail' | null

export type CheckResult = {
  /** Every d20 that was thrown: one, or two with advantage / disadvantage. */
  rolls: number[]
  /** The natural die that counts: the only one, the higher (advantage) or the lower (disadvantage). */
  kept: number
  success: boolean
  critical: Critical
  /** The mode this check was rolled with. */
  mode: RollMode
}

type CheckInput = {
  random?: () => number
  dc?: number
  mode?: RollMode
  modifier?: number
}

/** A natural 20 always succeeds and a natural 1 always fails, whatever the DC. */
export const rollCheck = ({
  random = Math.random,
  dc = DEFAULT_DC,
  mode = 'normal',
  modifier = CHECK_MODIFIER,
}: CheckInput = {}): CheckResult => {
  const first = rollD20(random)
  const rolls = mode === 'normal' ? [first] : [first, rollD20(random)]
  const kept =
    mode === 'advantage'
      ? Math.max(...rolls)
      : mode === 'disadvantage'
        ? Math.min(...rolls)
        : first
  const critical: Critical =
    kept === 20 ? 'success' : kept === 1 ? 'fail' : null
  const success =
    critical === 'success'
      ? true
      : critical === 'fail'
        ? false
        : kept + modifier >= dc
  return { rolls, kept, success, critical, mode }
}

/** Inspiration (natural 20) gives advantage and a natural 1 gives disadvantage, for exactly one check. */
export const nextMode = (result: CheckResult): RollMode =>
  result.critical === 'success'
    ? 'advantage'
    : result.critical === 'fail'
      ? 'disadvantage'
      : 'normal'

export const FAILURE_LINES: readonly string[] = [
  'The librarian shushes your spell. It fizzles.',
  'Your question rolls under the vending machine. Gone.',
  'A wild group project appears. You lose your train of thought.',
  'The Wi-Fi goblin steals your signal. Roll again.',
  'Your spell hits the printer. The printer jams in fear.',
  'You mumble the incantation wrong. Something about pizza slips out.',
  'The oracle is on a coffee break. Try again.',
  'Your die bounces off a stack of lecture notes and vanishes.',
]

export const SUCCESS_LINES: readonly string[] = [
  'The oracle nods. Your question is on its way!',
  'Your spell lands. Even the librarian approves.',
  'A friendly bard carries your words to the tower.',
  'The Wi-Fi goblin lets you through. This time.',
  'Accepted by the Guild of Hungry Students.',
  'Your cantrip sparkles. Sending!',
]

const pick = (lines: readonly string[], random: () => number): string => {
  const index = Math.floor(random() * lines.length)
  return lines[Math.min(lines.length - 1, Math.max(0, index))] ?? ''
}

export const pickFailureLine = (random: () => number = Math.random): string =>
  pick(FAILURE_LINES, random)

export const pickSuccessLine = (random: () => number = Math.random): string =>
  pick(SUCCESS_LINES, random)

const MODE_WORDS: Record<RollMode, string> = {
  normal: '',
  advantage: ' with advantage',
  disadvantage: ' with disadvantage',
}

/** What a screen reader hears, e.g. "Rolled 14 against DC 8: success". */
export const describeCheck = (
  result: CheckResult,
  dc: number = DEFAULT_DC
): string => {
  const rolled =
    result.rolls.length === 1
      ? `${result.kept}`
      : `${result.rolls.join(' and ')}, kept ${result.kept}`
  const base = `Rolled ${rolled}${MODE_WORDS[result.mode]} against DC ${dc}: ${result.success ? 'success' : 'failure'}.`
  if (result.critical === 'success')
    return `${base} Natural 20, inspiration! Your next check has advantage.`
  if (result.critical === 'fail')
    return `${base} Natural 1, critical fail! Your next check has disadvantage.`
  return base
}
