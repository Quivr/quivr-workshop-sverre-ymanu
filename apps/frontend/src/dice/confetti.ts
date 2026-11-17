export type ConfettiPiece = {
  /** Start position across the screen, in %. */
  left: number
  /** Sideways drift while falling, in px. */
  drift: number
  delayMs: number
  durationMs: number
  width: number
  height: number
  colour: number
}

/** Random pieces for the natural-20 shower. `colours` is the size of the palette. */
export const confettiPieces = (
  count: number,
  colours: number,
  random: () => number = Math.random
): ConfettiPiece[] =>
  Array.from({ length: count }, () => ({
    left: Math.round(random() * 100),
    drift: Math.round((random() - 0.5) * 200),
    delayMs: Math.round(random() * 600),
    durationMs: 1800 + Math.round(random() * 1200),
    width: 6 + Math.round(random() * 4),
    height: 10 + Math.round(random() * 6),
    colour: Math.min(colours - 1, Math.floor(random() * colours)),
  }))
