export type GateAction = 'send' | 'roll' | 'ignore'

type GateInput = {
  dungeonMode: boolean
  /** The agent is answering. */
  isRunning: boolean
  /** A dice overlay (check or random question) is open. */
  isRolling: boolean
  /** Nothing can be sent, e.g. no model loaded yet. */
  isDisabled?: boolean
  text: string
}

/** What pressing Send (or a suggested question) does: send now, roll a check first, or nothing. */
export const gateSend = ({
  dungeonMode,
  isRunning,
  isRolling,
  isDisabled = false,
  text,
}: GateInput): GateAction => {
  if (isRunning || isRolling || isDisabled) return 'ignore'
  if (!text.trim()) return 'ignore'
  return dungeonMode ? 'roll' : 'send'
}
