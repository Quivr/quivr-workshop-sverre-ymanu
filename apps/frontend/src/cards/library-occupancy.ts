export type Library = {
  name: string
  address?: string
  occupancy?: number
  capacity?: number
  percentFull?: number
  measuredAt?: string
}

export type Level = 'low' | 'medium' | 'high'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const num = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined

const str = (value: unknown) =>
  typeof value === 'string' && value !== '' ? value : undefined

/** Keeps the well-formed libraries from whatever the tool returned. */
export function parseLibraries(result: unknown): Library[] {
  if (!Array.isArray(result)) return []
  return result.filter(isRecord).flatMap(item => {
    const name = str(item.name)
    if (!name) return []
    return [
      {
        name,
        address: str(item.address),
        occupancy: num(item.occupancy),
        capacity: num(item.capacity),
        percentFull: num(item.percentFull),
        measuredAt: str(item.measuredAt),
      },
    ]
  })
}

export const levelFor = (percentFull: number): Level =>
  percentFull < 50 ? 'low' : percentFull < 80 ? 'medium' : 'high'

export const freeSeats = ({ occupancy, capacity }: Library) =>
  occupancy === undefined || capacity === undefined
    ? undefined
    : Math.max(capacity - occupancy, 0)

/** Least busy first; libraries without live data go last. */
export const sortLeastBusy = (libraries: Library[]) =>
  [...libraries].sort(
    (a, b) =>
      (a.percentFull ?? Infinity) - (b.percentFull ?? Infinity) ||
      a.name.localeCompare(b.name)
  )
