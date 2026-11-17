import { describe, expect, it } from 'vitest'

import { EDGE, FACES, faceFor, landTransform, placeTransform } from './geometry'

const numbersIn = (matrix: string) =>
  matrix.slice('matrix3d('.length, -1).split(',').map(Number)

/** Applies a matrix3d (column-major) to a 3D point. */
const apply = (matrix: string, [x, y, z]: number[]) => {
  const m = numbersIn(matrix)
  return [0, 1, 2].map(
    row => m[row]! * x! + m[4 + row]! * y! + m[8 + row]! * z! + m[12 + row]!
  )
}

describe('icosahedron geometry', () => {
  it('has 20 faces numbered 1..20 exactly once', () => {
    expect(FACES).toHaveLength(20)
    expect(FACES.map(face => face.number).sort((a, b) => a - b)).toEqual(
      Array.from({ length: 20 }, (_, index) => index + 1)
    )
  })

  it('puts opposite numbers on opposite faces (they add up to 21)', () => {
    for (const face of FACES) {
      const opposite = FACES.find(
        other =>
          other.n[0] * face.n[0] +
            other.n[1] * face.n[1] +
            other.n[2] * face.n[2] <
          -0.999
      )
      expect(opposite).toBeDefined()
      expect(face.number + opposite!.number).toBe(21)
    }
  })

  it('has faces that are one edge wide and orthonormal', () => {
    for (const { u, v, n } of FACES) {
      expect(Math.hypot(...u)).toBeCloseTo(1)
      expect(Math.hypot(...v)).toBeCloseTo(1)
      expect(u[0] * v[0] + u[1] * v[1] + u[2] * v[2]).toBeCloseTo(0)
      expect(u[0] * n[0] + u[1] * n[1] + u[2] * n[2]).toBeCloseTo(0)
    }
    expect(EDGE).toBeGreaterThan(0)
  })

  it('turns every face towards the viewer, upright', () => {
    for (let roll = 1; roll <= 20; roll++) {
      const face = faceFor(roll)
      const [x, y, z] = apply(landTransform(face), face.centre)
      expect(x).toBeCloseTo(0)
      expect(y).toBeCloseTo(0)
      expect(z).toBeGreaterThan(0)
    }
  })

  it('places a triangle at the face centre', () => {
    for (const face of FACES) {
      const placed = apply(placeTransform(face), [0, 0, 0])
      face.centre.forEach((value, index) =>
        expect(placed[index]).toBeCloseTo(value)
      )
    }
  })

  it('rejects rolls without a face', () => {
    expect(() => faceFor(0)).toThrow(RangeError)
    expect(() => faceFor(21)).toThrow(RangeError)
  })
})
