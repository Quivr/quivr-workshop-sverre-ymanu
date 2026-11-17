import { clamp, MARGIN, type Point, type Size } from './mannetjePlacement'

/**
 * How a quivr-mannetje roams: wander, get curious about the cursor, run away
 * when it comes too close. No DOM or React, so it is unit tested. The main
 * mannetje and every summoned one use the same brain.
 */

export const SIZE = 56 // px, matches h-14 w-14
export const WALK_SPEED = 70 // px per second
export const RUN_SPEED = 240
export const SPIN_MS = 700
const CURIOUS_MS = 4000 // how long after the last mouse move he stays interested
const CURIOUS_RADIUS = 280 // he notices the cursor within this distance
const COMFY_DISTANCE = 80 // he likes to stand about this far from the cursor
const TOO_CLOSE = 45 // closer than this and he steps away (tag!)
const CORNERED_DISTANCE = 20 // a flee target closer than this means he is stuck against an edge
const LOOK_DISTANCE = 700 // he looks at the cursor within this distance
export const LOOK_RANGE = 2.5 // how far the eyes move inside the Q, in SVG units

export type Pointer = Point & { at: number }
export type Roamer = {
  target: Point | null
  idleUntil: number
  spinUntil: number
}
export type Mode = 'idle' | 'walk' | 'hop' | 'spin'

export const newRoamer = (now: number, idleMs: number): Roamer => ({
  target: null,
  idleUntil: now + idleMs,
  spinUntil: 0,
})

/** The upper bound never drops below MARGIN, so a tiny viewport can't flip the range. */
export const clampPoint = (point: Point, viewport: Size): Point => ({
  x: clamp(point.x, MARGIN, viewport.width - SIZE - MARGIN),
  y: clamp(point.y, MARGIN, viewport.height - SIZE - MARGIN),
})

export const randomPoint = (
  viewport: Size,
  random: () => number = Math.random
): Point =>
  clampPoint(
    { x: random() * viewport.width, y: random() * viewport.height },
    viewport
  )

const centreOf = (position: Point): Point => ({
  x: position.x + SIZE / 2,
  y: position.y + SIZE / 2,
})

/** Distance from his centre to the cursor, or Infinity when he lost interest in it. */
export const distanceToPointer = (
  position: Point,
  pointer: Pointer | null,
  now: number
) => {
  if (!pointer || now - pointer.at >= CURIOUS_MS) return Infinity
  const centre = centreOf(position)
  return Math.hypot(pointer.x - centre.x, pointer.y - centre.y)
}

/**
 * Free roaming: spin after a click, play tag with the cursor, or wander off.
 * Sets `roamer.target` and returns what he is doing and how fast he should go.
 */
export const roam = (
  roamer: Roamer,
  position: Point,
  pointer: Pointer | null,
  now: number,
  viewport: Size,
  random: () => number = Math.random
): { mode: Mode; speed: number } => {
  if (now < roamer.spinUntil) {
    roamer.target = null
    return { mode: 'spin', speed: WALK_SPEED }
  }

  const distance = distanceToPointer(position, pointer, now)
  if (pointer && distance < CURIOUS_RADIUS) {
    const centre = centreOf(position)
    const gap = Math.max(distance, 1)
    const awayX = (centre.x - pointer.x) / gap
    const awayY = (centre.y - pointer.y) / gap
    if (distance < TOO_CLOSE) {
      // Too close: step away
      roamer.target = clampPoint(
        { x: position.x + awayX * 150, y: position.y + awayY * 150 },
        viewport
      )
      // Against an edge or corner "away" is clamped onto the spot he is
      // already on, so he would never move: run somewhere else instead
      if (
        Math.hypot(roamer.target.x - position.x, roamer.target.y - position.y) <
        CORNERED_DISTANCE
      ) {
        roamer.target = randomPoint(viewport, random)
      }
      return { mode: 'idle', speed: RUN_SPEED }
    }
    if (distance > COMFY_DISTANCE + 10) {
      // Curious: walk over, stop a little way from the cursor
      roamer.target = clampPoint(
        {
          x: pointer.x + awayX * COMFY_DISTANCE - SIZE / 2,
          y: pointer.y + awayY * COMFY_DISTANCE - SIZE / 2,
        },
        viewport
      )
      return { mode: 'idle', speed: WALK_SPEED * 1.8 }
    }
    roamer.target = null
    return { mode: 'hop', speed: WALK_SPEED }
  }

  if (!roamer.target && now >= roamer.idleUntil) {
    // Nothing going on: wander to a random spot
    roamer.target = randomPoint(viewport, random)
  }
  return { mode: 'idle', speed: WALK_SPEED }
}

/**
 * Moves `position` (in place) towards `roamer.target`, then keeps him inside
 * the viewport. Returns whether he is walking and which way he faces.
 */
export const moveToward = (
  roamer: Roamer,
  position: Point,
  speed: number,
  dt: number,
  now: number,
  viewport: Size,
  random: () => number = Math.random
): { isWalking: boolean; heading: number } => {
  let heading = 0
  let isWalking = false
  const { target } = roamer
  if (target) {
    const dx = target.x - position.x
    const dy = target.y - position.y
    const remaining = Math.hypot(dx, dy)
    const step = speed * dt
    heading = Math.sign(dx)
    if (remaining <= step) {
      position.x = target.x
      position.y = target.y
      roamer.target = null
      roamer.idleUntil = now + 1500 + random() * 3000
    } else {
      position.x += (dx / remaining) * step
      position.y += (dy / remaining) * step
      isWalking = true
    }
  }
  const clamped = clampPoint(position, viewport)
  position.x = clamped.x
  position.y = clamped.y
  return { isWalking, heading }
}

/** Where his eyes look, in SVG units: at the cursor, or the way he walks. */
export const lookAt = (
  position: Point,
  pointer: Pointer | null,
  now: number,
  heading: number
): Point => {
  const distance = distanceToPointer(position, pointer, now)
  if (pointer && distance < LOOK_DISTANCE) {
    const centre = centreOf(position)
    const gap = Math.max(distance, 1)
    return {
      x: ((pointer.x - centre.x) / gap) * LOOK_RANGE,
      y: ((pointer.y - centre.y) / gap) * LOOK_RANGE,
    }
  }
  return { x: heading * 1.2, y: 0 }
}
