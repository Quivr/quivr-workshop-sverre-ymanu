import { memo, useEffect, useRef, useState } from 'react'

import { placeSprite, usePrefersReducedMotion } from '../mannetjeDom'
import type { Point } from '../mannetjePlacement'
import {
  lookAt,
  moveToward,
  newRoamer,
  randomPoint,
  roam,
  SIZE,
  SPIN_MS,
  type Mode,
  type Pointer,
  type Roamer,
} from '../mannetjeRoam'
import { Mannetje } from './MannetjeSprite'

type Clone = {
  element: HTMLElement
  position: Point
  roamer: Roamer
  /** Some are quicker than others. */
  pace: number
  look: string
}

type Registry = Map<number, Clone>

const viewport = () => ({
  width: window.innerWidth,
  height: window.innerHeight,
})

/** One summoned mannetje: it registers with the crowd and is moved by the crowd's single loop. */
const Summoned = memo(function Summoned({
  index,
  registry,
  origin,
  isStill,
}: {
  index: number
  registry: Registry
  origin: () => Point
  isStill: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    // Out of the main mannetje, then off to explore (some right away, some a moment later)
    const position = isStill ? randomPoint(viewport()) : { ...origin() }
    const roamer = newRoamer(performance.now(), Math.random() * 1500)
    placeSprite(element, position)
    registry.set(index, {
      element,
      position,
      roamer,
      pace: 0.8 + Math.random() * 0.5,
      look: '',
    })
    return () => {
      registry.delete(index)
    }
  }, [index, registry, origin, isStill])

  return (
    <div
      ref={ref}
      data-mode="idle"
      data-quivr-mannetje=""
      className="quivr-mannetje pointer-events-none fixed top-0 left-0 z-40 h-14 w-14"
    >
      <Mannetje isDecorative />
    </div>
  )
})

/**
 * The summoned quivr-mannetjes (`/summon`): as many as asked for, no limit.
 * They roam and play with the cursor like the main one, but never talk. One
 * animation loop moves them all, so each extra one only costs a few DOM writes.
 */
export function MannetjeCrowd({
  count,
  origin,
}: {
  count: number
  /** Where a new one appears: the main mannetje's position. Must be stable. */
  origin: () => Point
}) {
  const [registry] = useState<Registry>(() => new Map())
  const isStill = usePrefersReducedMotion()

  useEffect(() => {
    if (isStill || count === 0) return
    let frame = 0
    let last = performance.now()
    let pointer: Pointer | null = null

    const handleMove = (event: PointerEvent) => {
      pointer = { x: event.clientX, y: event.clientY, at: performance.now() }
    }
    // Click close to one and it does a little spin
    const handleDown = (event: PointerEvent) => {
      const now = performance.now()
      for (const clone of registry.values()) {
        const dx = event.clientX - (clone.position.x + SIZE / 2)
        const dy = event.clientY - (clone.position.y + SIZE / 2)
        if (Math.hypot(dx, dy) < 100) clone.roamer.spinUntil = now + SPIN_MS
      }
    }

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      const size = viewport()

      for (const clone of registry.values()) {
        const { element, position, roamer } = clone
        const decision = roam(roamer, position, pointer, now, size)
        const { isWalking, heading } = moveToward(
          roamer,
          position,
          decision.speed * clone.pace,
          dt,
          now,
          size
        )
        const mode: Mode = isWalking ? 'walk' : decision.mode
        placeSprite(element, position)
        if (element.dataset.mode !== mode) element.dataset.mode = mode

        const eyes = lookAt(position, pointer, now, heading)
        const look = `${eyes.x.toFixed(1)} ${eyes.y.toFixed(1)}`
        if (look !== clone.look) {
          clone.look = look
          element.style.setProperty('--look-x', `${eyes.x.toFixed(1)}px`)
          element.style.setProperty('--look-y', `${eyes.y.toFixed(1)}px`)
        }
      }
      frame = requestAnimationFrame(tick)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerdown', handleDown)
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerdown', handleDown)
    }
  }, [count, isStill, registry])

  return Array.from({ length: count }, (_, index) => (
    <Summoned
      key={index}
      index={index}
      registry={registry}
      origin={origin}
      isStill={isStill}
    />
  ))
}
