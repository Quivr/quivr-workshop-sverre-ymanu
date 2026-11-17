/** Pure geometry for quivr-mannetje: where his bubble goes and where he stands. Unit tested. */

export type Point = { x: number; y: number }
export type Size = { width: number; height: number }
export type Box = { left: number; top: number; right: number; bottom: number }

export const MARGIN = 8
const BUBBLE_GAP = 12
const MIN_TAIL = 16
/** The bottom of the sprite is feet plus a shadow: let him sink in a little so he stands ON the text. */
const FEET_OVERLAP = 8

export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), Math.max(min, max))

/**
 * Where the speech bubble goes, in viewport coordinates: above him if there is
 * room, else below, always inside the viewport. `tailX` is where the tail
 * points, measured from the bubble's left edge.
 */
export const bubblePlacement = (
  sprite: Point,
  spriteSize: number,
  bubble: Size,
  viewport: Size
): { x: number; y: number; tailX: number; side: 'above' | 'below' } => {
  const roomAbove = sprite.y - MARGIN
  const roomBelow = viewport.height - (sprite.y + spriteSize) - MARGIN
  const needed = bubble.height + BUBBLE_GAP
  const side =
    roomAbove >= needed || (roomBelow < needed && roomAbove >= roomBelow)
      ? 'above'
      : 'below'
  const rawY =
    side === 'above'
      ? sprite.y - bubble.height - BUBBLE_GAP
      : sprite.y + spriteSize + BUBBLE_GAP
  const centre = sprite.x + spriteSize / 2
  const x = clamp(
    centre - bubble.width / 2,
    MARGIN,
    viewport.width - bubble.width - MARGIN
  )
  return {
    x,
    y: clamp(rawY, MARGIN, viewport.height - bubble.height - MARGIN),
    tailX: clamp(centre - x, MIN_TAIL, bubble.width - MIN_TAIL),
    side,
  }
}

/**
 * Where the sprite's top-left corner goes so he stands on top of `box`
 * (or just below it when there is no room above). The box is clipped to the
 * viewport first, so text scrolled half out of view still gets visited.
 */
export const standOn = (
  box: Box,
  spriteSize: number,
  viewport: Size
): Point => {
  const left = Math.max(box.left, 0)
  const right = Math.min(box.right, viewport.width)
  const top = Math.max(box.top, 0)
  const bottom = Math.min(box.bottom, viewport.height)
  const x = clamp(
    (left + right) / 2 - spriteSize / 2,
    MARGIN,
    viewport.width - spriteSize - MARGIN
  )
  const above = top - spriteSize + FEET_OVERLAP
  const y = above >= MARGIN ? above : bottom - FEET_OVERLAP / 2
  return { x, y: clamp(y, MARGIN, viewport.height - spriteSize - MARGIN) }
}
