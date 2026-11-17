import { describe, expect, it } from 'vitest'

import { bubblePlacement, clamp, standOn } from './mannetjePlacement'

const viewport = { width: 1000, height: 700 }
const bubble = { width: 288, height: 160 }

describe('clamp', () => {
  it('keeps a value in range, and never flips a too-small range', () => {
    expect(clamp(5, 0, 10)).toBe(5)
    expect(clamp(-5, 0, 10)).toBe(0)
    expect(clamp(50, 0, 10)).toBe(10)
    expect(clamp(5, 8, 2)).toBe(8)
  })
})

describe('bubblePlacement', () => {
  it('puts the bubble above him when there is room', () => {
    const placement = bubblePlacement({ x: 500, y: 400 }, 56, bubble, viewport)
    expect(placement.side).toBe('above')
    expect(placement.y + bubble.height).toBeLessThanOrEqual(400)
  })

  it('puts it below him near the top of the screen', () => {
    const placement = bubblePlacement({ x: 500, y: 20 }, 56, bubble, viewport)
    expect(placement.side).toBe('below')
    expect(placement.y).toBeGreaterThanOrEqual(20 + 56)
  })

  it('stays inside the viewport at the left and right edges', () => {
    const left = bubblePlacement({ x: 8, y: 400 }, 56, bubble, viewport)
    const right = bubblePlacement({ x: 936, y: 400 }, 56, bubble, viewport)
    expect(left.x).toBeGreaterThanOrEqual(8)
    expect(right.x + bubble.width).toBeLessThanOrEqual(1000 - 8)
  })

  it('points the tail at him, even when the bubble is shifted', () => {
    const placement = bubblePlacement({ x: 936, y: 400 }, 56, bubble, viewport)
    const tailInViewport = placement.x + placement.tailX
    expect(Math.abs(tailInViewport - (936 + 28))).toBeLessThanOrEqual(16)
  })

  it('picks the side with more room when neither fits', () => {
    const tall = { width: 288, height: 600 }
    expect(bubblePlacement({ x: 500, y: 100 }, 56, tall, viewport).side).toBe(
      'below'
    )
    expect(bubblePlacement({ x: 500, y: 560 }, 56, tall, viewport).side).toBe(
      'above'
    )
  })
})

describe('standOn', () => {
  const box = { left: 300, top: 300, right: 500, bottom: 330 }

  it('stands centred on top of the text', () => {
    const point = standOn(box, 56, viewport)
    expect(point.x).toBe(400 - 28)
    expect(point.y + 56).toBeGreaterThan(300)
    expect(point.y + 56).toBeLessThanOrEqual(300 + 8)
  })

  it('stands below the text when there is no room above', () => {
    const point = standOn({ ...box, top: 20, bottom: 50 }, 56, viewport)
    expect(point.y).toBeGreaterThanOrEqual(50 - 8)
  })

  it('still finds text that is scrolled half out of view', () => {
    const point = standOn(
      { left: -200, top: -300, right: 100, bottom: 400 },
      56,
      viewport
    )
    expect(point.x).toBeGreaterThanOrEqual(8)
    expect(point.y).toBeGreaterThanOrEqual(8)
  })

  it('never leaves the viewport', () => {
    const point = standOn(
      { left: 990, top: 690, right: 1200, bottom: 800 },
      56,
      viewport
    )
    expect(point.x + 56).toBeLessThanOrEqual(1000)
    expect(point.y + 56).toBeLessThanOrEqual(700)
  })
})
