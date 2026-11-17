import { useEffect, useEffectEvent, useRef, useState } from 'react'

import { confettiPieces, type ConfettiPiece } from '../dice/confetti'
import { rollD20 } from '../dice/rollD20'
import type { CheckPhase, CheckRun } from '../useDungeonCheck'
import { ConfettiShower, CONFETTI_COLOURS, DiceDie } from './DiceDie'

type Outcome = 'jackpot' | 'fail' | 'pass' | 'miss' | 'normal'

const CHECK_MS = 1400
const REDUCED_MS = 400
const FLICKER_MS = 70
const CONFETTI_COUNT = 40
const CONFETTI_MS = 3600
const DISMISS_MS = 2600
const CRIT_DISMISS_MS = 4200

const outcomeOf = ({ result }: CheckRun): Outcome =>
  result.critical === 'success'
    ? 'jackpot'
    : result.critical === 'fail'
      ? 'fail'
      : result.success
        ? 'pass'
        : 'miss'

const MODE_NOTE = {
  normal: '',
  advantage: 'Advantage: roll two, keep the higher',
  disadvantage: 'Disadvantage: roll two, keep the lower',
}

type StageProps = {
  run: CheckRun
  phase: CheckPhase
  onLand: () => void
  onClose: () => void
}

function CheckStage({ run, phase, onLand, onClose }: StageProps) {
  const { result, dc, isReduced } = run
  const [flicker, setFlicker] = useState<number[]>([])
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([])
  const closeRef = useRef<HTMLButtonElement>(null)

  const land = useEffectEvent(() => {
    if (result.critical === 'success' && !isReduced)
      setConfetti(confettiPieces(CONFETTI_COUNT, CONFETTI_COLOURS.length))
    onLand()
  })
  const close = useEffectEvent(onClose)

  useEffect(() => {
    if (phase !== 'rolling') return
    const flickering = isReduced
      ? undefined
      : setInterval(
          () => setFlicker(result.rolls.map(() => rollD20())),
          FLICKER_MS
        )
    const landing = setTimeout(land, isReduced ? REDUCED_MS : CHECK_MS)
    return () => {
      clearInterval(flickering)
      clearTimeout(landing)
    }
  }, [phase, isReduced, result])

  useEffect(() => {
    if (phase !== 'landed') return
    closeRef.current?.focus()
    const dismiss = setTimeout(
      close,
      result.critical ? CRIT_DISMISS_MS : DISMISS_MS
    )
    const confettiEnd = setTimeout(() => setConfetti([]), CONFETTI_MS)
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      clearTimeout(dismiss)
      clearTimeout(confettiEnd)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [phase, result])

  const isLanded = phase === 'landed'
  const outcome = isLanded ? outcomeOf(run) : 'normal'
  const hasTwoDice = result.rolls.length > 1
  const keptIndex = result.rolls.indexOf(result.kept)

  return (
    <div
      role="dialog"
      aria-label="Ability check"
      data-outcome={outcome}
      onClick={onClose}
      className="dice-overlay fixed inset-0 z-40 flex items-center justify-center backdrop-blur-sm"
    >
      {confetti.length > 0 && <ConfettiShower pieces={confetti} />}
      <div
        className="dice-stage relative flex flex-col items-center gap-2 px-4 py-8"
        data-phase={phase}
        data-outcome={outcome}
      >
        <p className="font-title text-heading text-3xl tracking-wide">
          Ability check · vs DC {dc}
        </p>
        <p className="text-muted min-h-4 text-xs">{MODE_NOTE[result.mode]}</p>
        <div className="flex items-start gap-6">
          {result.rolls.map((value, index) => (
            <div
              key={index}
              className="dice-column flex flex-col items-center gap-1"
              data-dim={isLanded && hasTwoDice && index !== keptIndex}
            >
              <DiceDie
                roll={value}
                ms={CHECK_MS}
                size={hasTwoDice ? 'small' : 'normal'}
                hasBurst={outcome === 'jackpot' && index === keptIndex}
              />
              <p
                aria-hidden="true"
                data-rolling={!isLanded}
                className={`dice-number font-title text-heading min-h-[1em] tabular-nums ${hasTwoDice ? 'text-5xl' : 'text-6xl'}`}
              >
                {isLanded ? value : (flicker[index] ?? '?')}
              </p>
              {hasTwoDice && (
                <p className="text-muted min-h-4 text-xs">
                  {isLanded ? (index === keptIndex ? 'kept' : 'dropped') : ''}
                </p>
              )}
            </div>
          ))}
        </div>
        <div className="flex min-h-24 flex-col items-center gap-1">
          {isLanded && (
            <>
              <p
                className={`dice-label font-title rounded-md px-3 py-1 text-3xl tracking-wider ${result.success ? 'bg-ok-tint text-ok-text' : 'bg-danger/10 text-danger-text'}`}
              >
                {result.success ? 'SUCCESS' : 'FAILED'}
              </p>
              {result.critical === 'success' && (
                <p
                  // dark-mode-ok: dark text on the brand yellow bg-main (6.67:1) in both themes
                  className="dice-label bg-main text-sidenav-blue font-title rounded-md px-3 py-1 text-xl tracking-wider"
                >
                  NATURAL 20 · Inspiration!
                </p>
              )}
              {result.critical === 'fail' && (
                <p className="dice-label bg-danger/10 text-danger-text font-title rounded-md px-3 py-1 text-xl tracking-wider">
                  NATURAL 1 · Critical fail!
                </p>
              )}
            </>
          )}
        </div>
        <p className="min-h-10 max-w-xs text-center text-sm">
          {isLanded ? run.line : 'Rolling…'}
        </p>
        <p className="text-muted min-h-4 text-xs">
          {isLanded && result.critical === 'success'
            ? 'Inspiration: your next check has advantage.'
            : isLanded && result.critical === 'fail'
              ? 'Your next check has disadvantage.'
              : isLanded && !result.success
                ? 'Your question is still in the box. Roll again!'
                : ''}
        </p>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className={`text-muted hover:text-heading text-xs underline ${isLanded ? '' : 'invisible'}`}
        >
          Close (Esc)
        </button>
      </div>
    </div>
  )
}

type Props = {
  run: CheckRun | null
  phase: CheckPhase
  announcement: string
  onLand: () => void
  onClose: () => void
}

/** The ability-check overlay: it sits over the page (fixed), so the chat never moves. */
export function CheckOverlay({
  run,
  phase,
  announcement,
  onLand,
  onClose,
}: Props) {
  return (
    <>
      {run && phase !== 'idle' && (
        <CheckStage
          key={run.id}
          run={run}
          phase={phase}
          onLand={onLand}
          onClose={onClose}
        />
      )}
      <p
        aria-live="polite"
        className="sr-only"
      >
        {announcement}
      </p>
    </>
  )
}
