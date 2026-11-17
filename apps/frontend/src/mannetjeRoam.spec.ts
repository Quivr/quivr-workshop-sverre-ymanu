import { describe, expect, it } from 'vitest'

import {
  SIZE,
  lookAt,
  moveToward,
  newRoamer,
  randomPoint,
  roam,
  type Pointer,
} from './mannetjeRoam'

const viewport = { width: 1000, height: 700 }
const never = () => 0.5

describe('randomPoint', () => {
  it('stays inside the viewport, even a tiny one', () => {
    const point = randomPoint({ width: 20, height: 20 }, () => 1)
    expect(point.x).toBe(8)
    expect(point.y).toBe(8)
    const big = randomPoint(viewport, () => 1)
    expect(big.x + SIZE).toBeLessThanOrEqual(1000)
  })
})

describe('roam', () => {
  it('wanders off once the breather is over, not before', () => {
    const roamer = newRoamer(0, 2500)
    const position = { x: 100, y: 100 }
    roam(roamer, position, null, 1000, viewport, never)
    expect(roamer.target).toBeNull()
    roam(roamer, position, null, 2500, viewport, never)
    expect(roamer.target).not.toBeNull()
  })

  it('walks over to a cursor that is near and moving', () => {
    const roamer = newRoamer(0, 0)
    const pointer: Pointer = { x: 400, y: 100, at: 1000 }
    const { speed } = roam(roamer, { x: 100, y: 100 }, pointer, 1100, viewport)
    expect(roamer.target).not.toBeNull()
    // He stops short of the cursor
    expect(Math.abs(roamer.target!.x + SIZE / 2 - 400)).toBeGreaterThan(40)
    expect(speed).toBeGreaterThan(70)
  })

  it('hops when he stands next to the cursor', () => {
    const roamer = newRoamer(0, 0)
    const position = { x: 100, y: 100 }
    const pointer: Pointer = { x: 100 + SIZE / 2 + 80, y: 128, at: 1000 }
    expect(roam(roamer, position, pointer, 1100, viewport).mode).toBe('hop')
    expect(roamer.target).toBeNull()
  })

  it('runs away when the cursor is on top of him', () => {
    const roamer = newRoamer(0, 0)
    const position = { x: 500, y: 300 }
    const pointer: Pointer = { x: 500 + SIZE / 2 + 10, y: 328, at: 1000 }
    roam(roamer, position, pointer, 1100, viewport)
    expect(roamer.target!.x).toBeLessThan(position.x)
  })

  it('runs somewhere else when he is cornered', () => {
    const roamer = newRoamer(0, 0)
    // In the bottom-right corner with the cursor pushing him into it
    const position = { x: 1000 - SIZE - 8, y: 700 - SIZE - 8 }
    const pointer: Pointer = {
      x: position.x + 10,
      y: position.y + 10,
      at: 1000,
    }
    roam(roamer, position, pointer, 1100, viewport, () => 0.1)
    const target = roamer.target!
    expect(
      Math.hypot(target.x - position.x, target.y - position.y)
    ).toBeGreaterThan(20)
  })

  it('loses interest in a cursor that stopped moving', () => {
    const roamer = newRoamer(0, 0)
    const pointer: Pointer = { x: 300, y: 100, at: 0 }
    roam(roamer, { x: 100, y: 100 }, pointer, 10_000, viewport, never)
    // Back to wandering: the target is a random spot, not near the cursor
    expect(roamer.target).toEqual(randomPoint(viewport, never))
  })

  it('spins in place after a click', () => {
    const roamer = newRoamer(0, 0)
    roamer.spinUntil = 5000
    expect(roam(roamer, { x: 1, y: 1 }, null, 1000, viewport).mode).toBe('spin')
  })
})

describe('moveToward', () => {
  it('walks a step and arrives on the target', () => {
    const roamer = newRoamer(0, 0)
    roamer.target = { x: 200, y: 100 }
    const position = { x: 100, y: 100 }
    const first = moveToward(roamer, position, 100, 0.5, 0, viewport, never)
    expect(first.isWalking).toBe(true)
    expect(first.heading).toBe(1)
    expect(position.x).toBe(150)
    moveToward(roamer, position, 100, 1, 0, viewport, never)
    expect(position.x).toBe(200)
    expect(roamer.target).toBeNull()
    expect(roamer.idleUntil).toBeGreaterThan(0)
  })

  it('never leaves the viewport', () => {
    const roamer = newRoamer(0, 0)
    const position = { x: 5000, y: -50 }
    moveToward(roamer, position, 100, 0.1, 0, viewport, never)
    expect(position.x + SIZE).toBeLessThanOrEqual(1000)
    expect(position.y).toBeGreaterThanOrEqual(8)
  })
})

describe('lookAt', () => {
  it('looks at the cursor, or the way he walks when it is far or stale', () => {
    const position = { x: 100, y: 100 }
    const right = lookAt(position, { x: 600, y: 128, at: 0 }, 100, 0)
    expect(right.x).toBeGreaterThan(2)
    expect(lookAt(position, { x: 600, y: 128, at: 0 }, 99_999, -1)).toEqual({
      x: -1.2,
      y: 0,
    })
  })
})
