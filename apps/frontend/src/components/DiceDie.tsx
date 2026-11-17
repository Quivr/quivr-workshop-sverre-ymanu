import type { CSSProperties } from 'react'

import type { ConfettiPiece } from '../dice/confetti'
import {
  EDGE,
  FACES,
  FACE_HEIGHT,
  faceFor,
  landTransform,
  placeTransform,
} from '../dice/geometry'

export const CONFETTI_COLOURS = [
  'var(--color-main)',
  'var(--color-green-status)',
  'var(--color-blue-pretty)',
  'var(--color-danger)',
  'var(--color-vegetarian)',
]

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

type DieProps = {
  /** The face it lands on, or null before the roll is known. */
  roll: number | null
  /** How long the throw lasts. */
  ms: number
  hasBurst?: boolean
  size?: 'normal' | 'small'
}

/** The 3D D20: throws itself and lands on `roll`. Colours come from the surrounding `.dice-stage`. */
export function DiceDie({
  roll,
  ms,
  hasBurst = false,
  size = 'normal',
}: DieProps) {
  const style = {
    '--dice-ms': `${ms}ms`,
    '--dice-land': roll === null ? 'none' : landTransform(faceFor(roll)),
  } as CSSProperties

  return (
    <div
      className="dice-slot"
      data-size={size}
    >
      <div
        className="dice-die"
        aria-hidden="true"
        style={style}
      >
        <div className="dice-ring" />
        {hasBurst && <div className="dice-burst" />}
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
    </div>
  )
}

/** The natural-20 shower. Render it only when there are pieces. */
export function ConfettiShower({ pieces }: { pieces: ConfettiPiece[] }) {
  return (
    <div
      className="dice-confetti"
      aria-hidden="true"
    >
      {pieces.map((piece, index) => (
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
  )
}
