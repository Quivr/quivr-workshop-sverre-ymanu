export type Place = {
  name?: string | null
  address?: string | null
  latitude?: number | null
  longitude?: number | null
}

export type ClassItem = { kind: 'class' | 'event'; start: string; end: string }

export type Candidate = { id: string; name: string; place?: Place | null }

export type MatchRule = 'distance' | 'address' | 'first-open'

export type Match<T extends Candidate> = {
  restaurant: T
  rule: MatchRule
  distanceKm?: number
}

/** First class that has not ended at `after` (the whole day when `after` is null). Items must be sorted by start. */
export const pickNextClass = <T extends ClassItem>(
  items: T[],
  after: Date | null
): { item: T; status: 'ongoing' | 'upcoming' } | null => {
  for (const item of items) {
    if (item.kind !== 'class') continue
    if (after && new Date(item.end) <= after) continue
    const started = after !== null && new Date(item.start) <= after
    return { item, status: started ? 'ongoing' : 'upcoming' }
  }
  return null
}

const EARTH_RADIUS_KM = 6371

export const distanceKm = (
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
): number => {
  const rad = (degrees: number) => (degrees * Math.PI) / 180
  const dLat = rad(b.latitude - a.latitude)
  const dLon = rad(b.longitude - a.longitude)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitude)) *
      Math.cos(rad(b.latitude)) *
      Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))
}

const hasCoordinates = (
  place: Place | null | undefined
): place is Place & { latitude: number; longitude: number } =>
  typeof place?.latitude === 'number' && typeof place.longitude === 'number'

const normalise = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

const addressText = (place: Place | null | undefined) =>
  normalise(place?.address || place?.name || '')

/** "Celestijnenlaan 200 P - 3001 Heverlee" → "celestijnenlaan". Empty when there is no street. */
const streetOf = (text: string) =>
  text.split(/\d/)[0]?.replace(/[\s,.-]+$/, '') ?? ''
const postcodeOf = (text: string) => /\b\d{4}\b/.exec(text)?.[0]

/** 2 points for the same street, 1 for the same postcode. */
const addressScore = (a: string, b: string) => {
  const street = streetOf(a)
  const postcode = postcodeOf(a)
  return (
    (street.length > 3 && street === streetOf(b) ? 2 : 0) +
    (postcode && postcode === postcodeOf(b) ? 1 : 0)
  )
}

/**
 * Picks the restaurant closest to `place`, in this order:
 * 1. `distance`: straight-line distance, when the place and at least one candidate have coordinates.
 * 2. `address`: same street, then same postcode, in the address text.
 * 3. `first-open`: the first candidate (nothing to compare).
 * Candidates are expected to be restaurants that are open and have a menu that day.
 */
export const closestRestaurant = <T extends Candidate>(
  place: Place | null | undefined,
  candidates: T[]
): Match<T> | null => {
  const first = candidates[0]
  if (!first) return null

  if (hasCoordinates(place)) {
    const ranked = candidates
      .flatMap(restaurant =>
        hasCoordinates(restaurant.place)
          ? [{ restaurant, km: distanceKm(place, restaurant.place) }]
          : []
      )
      .sort((a, b) => a.km - b.km)
    const best = ranked[0]
    if (best) {
      return {
        restaurant: best.restaurant,
        rule: 'distance',
        distanceKm: Math.round(best.km * 10) / 10,
      }
    }
  }

  const target = addressText(place)
  if (target) {
    let best: { restaurant: T; score: number } | undefined
    for (const restaurant of candidates) {
      const score = addressScore(target, addressText(restaurant.place))
      if (score > 0 && (!best || score > best.score))
        best = { restaurant, score }
    }
    if (best) return { restaurant: best.restaurant, rule: 'address' }
  }

  return { restaurant: first, rule: 'first-open' }
}
