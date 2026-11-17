import { useRef, useState } from 'react'

import { prefersReducedMotion } from './dice/browser'
import {
  DEFAULT_DC,
  describeCheck,
  nextMode,
  pickFailureLine,
  pickSuccessLine,
  rollCheck,
  type CheckResult,
  type RollMode,
} from './dice/check'

export type CheckPhase = 'idle' | 'rolling' | 'landed'

export type CheckRun = {
  id: number
  text: string
  dc: number
  result: CheckResult
  line: string
  isReduced: boolean
}

type Options = {
  /** False when nothing can be sent right now, so a success does not fire a second run. */
  canSend: boolean
  onPass: (text: string) => void
  onResult: (passed: boolean) => void
}

/**
 * The Dungeon mode ability check: roll, land, and (on success) send.
 * The advantage / disadvantage earned by a natural 20 / 1 lives in memory only:
 * it is a one-check reward, so a reload forgetting it is fine.
 */
export function useDungeonCheck({ canSend, onPass, onResult }: Options) {
  const [phase, setPhase] = useState<CheckPhase>('idle')
  const [run, setRun] = useState<CheckRun | null>(null)
  const [mode, setMode] = useState<RollMode>('normal')
  const [announcement, setAnnouncement] = useState('')
  const runCount = useRef(0)

  const start = (text: string) => {
    if (phase !== 'idle') return
    const result = rollCheck({ dc: DEFAULT_DC, mode })
    runCount.current += 1
    setRun({
      id: runCount.current,
      text,
      dc: DEFAULT_DC,
      result,
      line: result.success ? pickSuccessLine() : pickFailureLine(),
      isReduced: prefersReducedMotion(),
    })
    setAnnouncement('')
    setPhase('rolling')
  }

  /** Called by the overlay when the die has landed. The prompt goes out right now, not when the overlay closes. */
  const land = () => {
    if (phase !== 'rolling' || !run) return
    setPhase('landed')
    setMode(nextMode(run.result))
    setAnnouncement(describeCheck(run.result, run.dc))
    onResult(run.result.success)
    if (run.result.success && canSend) onPass(run.text)
  }

  const close = () => {
    if (phase === 'landed') setPhase('idle')
  }

  return { phase, run, mode, announcement, start, land, close }
}
