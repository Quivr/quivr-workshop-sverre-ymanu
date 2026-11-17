/** Edge length of one triangular face, in px. */
export const EDGE = 78
/** Height of the face triangle (apex up), in px. */
export const FACE_HEIGHT = (EDGE * Math.sqrt(3)) / 2

type Vec = [number, number, number]

const PHI = (1 + Math.sqrt(5)) / 2

const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: Vec, b: Vec): Vec => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]
const unit = (a: Vec): Vec => {
  const length = Math.hypot(...a)
  return [a[0] / length, a[1] / length, a[2] / length]
}

/** The 12 vertices of an icosahedron with edge 2: (0, ±1, ±φ) and its cyclic permutations. */
const UNIT_VERTICES: Vec[] = [1, -1].flatMap(s1 =>
  [1, -1].flatMap(s2 => [
    [0, s1, s2 * PHI] as Vec,
    [s1, s2 * PHI, 0] as Vec,
    [s2 * PHI, 0, s1] as Vec,
  ])
)

export type Face = {
  /** The number written on this face, 1..20. */
  number: number
  /** Centre of the face, relative to the middle of the die, in px. */
  centre: Vec
  /** Orthonormal frame of the face: u to the right, v down (apex up), n out of the face. */
  u: Vec
  v: Vec
  n: Vec
}

const scale = EDGE / 2

/** The 20 triangles: every triple of vertices that are all one edge apart. */
const triangles = (): [Vec, Vec, Vec][] => {
  const found: [Vec, Vec, Vec][] = []
  const isEdge = (a: Vec, b: Vec) =>
    Math.abs(dot(sub(a, b), sub(a, b)) - 4) < 1e-9
  UNIT_VERTICES.forEach((a, i) =>
    UNIT_VERTICES.forEach((b, j) =>
      UNIT_VERTICES.forEach((c, k) => {
        if (i < j && j < k && isEdge(a, b) && isEdge(b, c) && isEdge(a, c))
          found.push([a, b, c])
      })
    )
  )
  return found
}

const frameOf = ([a, b, c]: [Vec, Vec, Vec]): Omit<Face, 'number'> => {
  const centre: Vec = [
    ((a[0] + b[0] + c[0]) / 3) * scale,
    ((a[1] + b[1] + c[1]) / 3) * scale,
    ((a[2] + b[2] + c[2]) / 3) * scale,
  ]
  const n = unit(centre)
  const v = unit(sub(centre, [a[0] * scale, a[1] * scale, a[2] * scale]))
  return { centre, n, v, u: cross(v, n) }
}

/** Real dice have opposite faces that add up to 21. */
const numbered = (frames: Omit<Face, 'number'>[]): Face[] => {
  const numbers = new Array<number>(frames.length).fill(0)
  let next = 1
  frames.forEach((frame, index) => {
    if (numbers[index]) return
    const opposite = frames.findIndex(other => dot(other.n, frame.n) < -0.999)
    numbers[index] = next
    numbers[opposite] = 21 - next
    next++
  })
  return frames.map((frame, index) => ({ ...frame, number: numbers[index]! }))
}

export const FACES: Face[] = numbered(triangles().map(frameOf))

const matrix3d = (columns: Vec[], translation: Vec) =>
  `matrix3d(${[...columns.flatMap(column => [...column, 0]), ...translation, 1]
    .map(value => value.toFixed(5))
    .join(',')})`

/** Puts a flat triangle (centred on the middle of the die) onto its face. */
export const placeTransform = ({ u, v, n, centre }: Face) =>
  matrix3d([u, v, n], centre)

/** Turns the die so that this face looks at the viewer, apex up. */
export const landTransform = ({ u, v, n }: Face) =>
  matrix3d(
    [
      [u[0], v[0], n[0]],
      [u[1], v[1], n[1]],
      [u[2], v[2], n[2]],
    ],
    [0, 0, 0]
  )

export const faceFor = (roll: number): Face => {
  const face = FACES.find(candidate => candidate.number === roll)
  if (!face) throw new RangeError(`Not a D20 roll: ${roll}`)
  return face
}
