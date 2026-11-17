import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type CSSProperties,
} from 'react'

import { confettiPieces, type ConfettiPiece } from '../dice/confetti'
import {
  EDGE,
  FACES,
  FACE_HEIGHT,
  faceFor,
  landTransform,
  placeTransform,
} from '../dice/geometry'
import { formatRollMessage, promptForRoll } from '../dice/prompts'
import { rollD20 } from '../dice/rollD20'
import { formatStats, loadStats, recordRoll, saveStats } from '../dice/stats'

type Props = {
  isDisabled: boolean
  onSend: (text: string) => void
}

type Phase = 'idle' | 'rolling' | 'landed'
type Outcome = 'jackpot' | 'fail' | 'normal'

const ROLL_MS = 2000
const REDUCED_MS = 450
const FLICKER_MS = 70
const CONFETTI_COUNT = 40
const CONFETTI_MS = 3600
const DISMISS_MS = 4500
const JACKPOT_DISMISS_MS = 6000
const CONFETTI_COLOURS = [
  'var(--color-main)',
  'var(--color-green-status)',
  'var(--color-blue-pretty)',
  'var(--color-danger)',
  'var(--color-vegetarian)',
]

const outcomeOf = (roll: number): Outcome =>
  roll === 20 ? 'jackpot' : roll === 1 ? 'fail' : 'normal'

const OUTCOME_LABEL: Record<Outcome, string | null> = {
  jackpot: 'JACKPOT',
  fail: 'CRITICAL FAIL',
  normal: null,
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const noStorage = { getItem: () => null, setItem: () => undefined }
const storage = () => {
  try {
    return window.localStorage
  } catch {
    return noStorage
  }
}

const FACE_BOX: CSSProperties = {
  width: EDGE,
  height: FACE_HEIGHT,
  left: `calc(50% - ${EDGE / 2}px)`,
  top: `calc(50% - ${(FACE_HEIGHT * 2) / 3}px)`,
  transformOrigin: '50% 66.6667%',
}

const FACE_STYLES = FACES.map(
  (face, index) =>
    ({
      ...FACE_BOX,
      transform: placeTransform(face),
      '--tint': `${(index % 4) * 6}%`,
    }) as CSSProperties
)

function MiniDie() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2 21 7v10l-9 5-9-5V7z" />
      <path d="M12 7 8 15h8zM12 2v5M21 7l-5 8M3 7l5 8M12 22v-7M8 15l-5 2M16 15l5 2" />
    </svg>
  )
}

export function DiceRoller({ isDisabled, onSend }: Props) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [roll, setRoll] = useState<number | null>(null)
  const [shown, setShown] = useState<number | null>(null)
  const [isReduced, setIsReduced] = useState(false)
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([])
  const [stats, setStats] = useState(() => loadStats(storage()))
  const closeRef = useRef<HTMLButtonElement>(null)

  const land = useEffectEvent((value: number, reduced: boolean) => {
    const next = recordRoll(stats, value)
    setStats(next)
    saveStats(storage(), next)
    setShown(value)
    setConfetti(
      value === 20 && !reduced
        ? confettiPieces(CONFETTI_COUNT, CONFETTI_COLOURS.length)
        : []
    )
    setPhase('landed')
    if (!isDisabled) onSend(formatRollMessage(value))
  })

  useEffect(() => {
    if (phase !== 'rolling' || roll === null) return
    const flicker = isReduced
      ? undefined
      : setInterval(() => setShown(rollD20()), FLICKER_MS)
    const landing = setTimeout(
      () => land(roll, isReduced),
      isReduced ? REDUCED_MS : ROLL_MS
    )
    return () => {
      clearInterval(flicker)
      clearTimeout(landing)
    }
  }, [phase, roll, isReduced])

  useEffect(() => {
    if (phase !== 'landed') return
    closeRef.current?.focus()
    const dismiss = setTimeout(
      () => setPhase('idle'),
      roll === 20 ? JACKPOT_DISMISS_MS : DISMISS_MS
    )
    const confettiEnd = setTimeout(() => setConfetti([]), CONFETTI_MS)
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPhase('idle')
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      clearTimeout(dismiss)
      clearTimeout(confettiEnd)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [phase, roll])

  const start = () => {
    if (isDisabled || phase !== 'idle') return
    const reduced = prefersReducedMotion()
    setIsReduced(reduced)
    setRoll(rollD20())
    setShown(reduced ? null : rollD20())
    setConfetti([])
    setPhase('rolling')
  }

  const close = () => {
    if (phase === 'landed') setPhase('idle')
  }

  const outcome =
    roll === null || phase !== 'landed' ? 'normal' : outcomeOf(roll)
  const label = OUTCOME_LABEL[outcome]
  const stageStyle = {
    '--dice-ms': `${ROLL_MS}ms`,
    '--dice-land': roll === null ? 'none' : landTransform(faceFor(roll)),
  } as CSSProperties

  return (
    <>
      <div className="mb-2 flex items-center gap-3">
        <button
          type="button"
          onClick={start}
          disabled={isDisabled || phase !== 'idle'}
          aria-label="Roll the dice for a random question"
          className="border-schedule-border-grey bg-surface text-heading hover:bg-cardbg flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-bold disabled:opacity-50"
        >
          <MiniDie />
          Roll the dice
        </button>
        <span
          className="text-muted text-xs"
          title="Your rolls, natural 20s (🍀) and natural 1s (💀)"
        >
          {formatStats(stats)}
        </span>
      </div>
      {phase !== 'idle' && roll !== null && (
        <div
          role="dialog"
          aria-label="Dice roll"
          data-outcome={outcome}
          onClick={close}
          className="dice-overlay fixed inset-0 z-40 flex items-center justify-center backdrop-blur-sm"
        >
          {confetti.length > 0 && (
            <div
              className="dice-confetti"
              aria-hidden="true"
            >
              {confetti.map((piece, index) => (
                <span
                  key={index}
                  className="dice-confetti-piece"
                  style={
                    {
                      left: `${piece.left}%`,
                      width: piece.width,
                      height: piece.height,
                      backgroundColor: CONFETTI_COLOURS[piece.colour],
                      '--drift': `${piece.drift}px`,
                      '--dur': `${piece.durationMs}ms`,
                      '--delay': `${piece.delayMs}ms`,
                    } as CSSProperties
                  }
                />
              ))}
            </div>
          )}
          <div
            className="dice-stage relative flex flex-col items-center gap-3 px-4 py-8"
            data-phase={phase}
            data-outcome={outcome}
            style={stageStyle}
          >
            <div
              className="dice-die"
              aria-hidden="true"
            >
              <div className="dice-ring" />
              {outcome === 'jackpot' && <div className="dice-burst" />}
              <div className="dice-throw">
                <div className="dice-spin">
                  {FACES.map((face, index) => (
                    <div
                      key={face.number}
                      className="dice-face"
                      style={FACE_STYLES[index]}
                    >
                      <span className="dice-face-number">{face.number}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <p
              aria-hidden="true"
              data-rolling={phase === 'rolling'}
              className="dice-number font-title text-heading min-h-[1em] text-6xl tabular-nums"
            >
              {shown ?? '?'}
            </p>
            <div className="flex min-h-8 items-center">
              {outcome === 'jackpot' && (
                <p
                  // dark-mode-ok: dark text on the brand yellow bg-main (6.67:1) in both themes
                  className="dice-label bg-main text-sidenav-blue font-title rounded-md px-3 py-1 text-2xl tracking-wider"
                >
                  {label}
                </p>
              )}
              {outcome === 'fail' && (
                <p className="dice-label bg-danger/10 text-danger-text font-title rounded-md px-3 py-1 text-2xl tracking-wider">
                  {label}
                </p>
              )}
            </div>
            <p className="min-h-10 max-w-xs text-center text-sm">
              {phase === 'landed' ? promptForRoll(roll) : 'Rolling…'}
            </p>
            <button
              ref={closeRef}
              type="button"
              onClick={close}
              className={`text-muted hover:text-heading text-xs underline ${phase === 'landed' ? '' : 'invisible'}`}
            >
              Close (Esc)
            </button>
          </div>
          <p
            aria-live="polite"
            className="sr-only"
          >
            {phase === 'landed'
              ? `You rolled ${roll}.${label ? ` ${label}.` : ''} ${promptForRoll(roll)}`
              : ''}
          </p>
        </div>
      )}
    </>
  )
}
