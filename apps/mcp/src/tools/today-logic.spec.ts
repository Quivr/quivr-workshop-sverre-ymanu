import { describe, expect, it } from 'vitest'

import { closestRestaurant, distanceKm, pickNextClass } from './today-logic.js'

const item = (kind: 'class' | 'event', start: string, end: string) => ({
  kind,
  start: `2026-11-17T${start}:00+01:00`,
  end: `2026-11-17T${end}:00+01:00`,
})

describe('pickNextClass', () => {
  const items = [
    item('event', '08:00', '09:00'),
    item('class', '10:00', '12:00'),
    item('class', '14:00', '16:00'),
  ]

  it('takes the first class of the day without a time and skips events', () => {
    expect(pickNextClass(items, null)).toEqual({
      item: items[1],
      status: 'upcoming',
    })
  })

  it('skips classes that already ended', () => {
    const after = new Date('2026-11-17T12:30:00+01:00')
    expect(pickNextClass(items, after)?.item).toBe(items[2])
  })

  it('flags a class in progress as ongoing', () => {
    const after = new Date('2026-11-17T10:30:00+01:00')
    expect(pickNextClass(items, after)).toEqual({
      item: items[1],
      status: 'ongoing',
    })
  })

  it('returns null when nothing is left', () => {
    expect(pickNextClass(items, new Date('2026-11-17T18:00:00+01:00'))).toBe(
      null
    )
    expect(pickNextClass([], null)).toBe(null)
  })
})

describe('distanceKm', () => {
  it('is about 111 km per degree of latitude', () => {
    const km = distanceKm(
      { latitude: 50, longitude: 4 },
      { latitude: 51, longitude: 4 }
    )
    expect(km).toBeGreaterThan(110.5)
    expect(km).toBeLessThan(111.9)
  })
})

describe('closestRestaurant', () => {
  const alma1 = {
    id: '1',
    name: 'Alma 1',
    place: {
      address: 'Tiensestraat 115 - 3000 Leuven',
      latitude: 50.877,
      longitude: 4.7,
    },
  }
  const alma3 = {
    id: '3',
    name: 'Alma 3',
    place: {
      address: 'Steengroevenlaan 3 - 3001 Heverlee',
      latitude: 50.86,
      longitude: 4.68,
    },
  }
  const alma7 = {
    id: '7',
    name: 'Alma 7',
    place: { address: 'Celestijnenlaan 200 P - 3001 Heverlee' },
  }

  it('returns null without candidates', () => {
    expect(closestRestaurant({ address: 'x' }, [])).toBe(null)
  })

  it('uses distance when coordinates exist', () => {
    const match = closestRestaurant(
      { name: 'Aula', latitude: 50.8605, longitude: 4.6805 },
      [alma1, alma3]
    )
    expect(match).toMatchObject({ rule: 'distance', restaurant: alma3 })
    expect(match?.distanceKm).toBeLessThan(0.2)
  })

  it('ignores candidates without coordinates when ranking by distance', () => {
    const match = closestRestaurant({ latitude: 50.877, longitude: 4.7 }, [
      alma7,
      alma1,
    ])
    expect(match).toMatchObject({ rule: 'distance', restaurant: alma1 })
  })

  it('falls back to the same street, then the same postcode', () => {
    const noCoords = (r: typeof alma1) => ({
      ...r,
      place: { address: r.place.address },
    })
    expect(
      closestRestaurant({ address: 'Celestijnenlaan 300A - 3001 Heverlee' }, [
        noCoords(alma1),
        noCoords(alma3),
        alma7,
      ])
    ).toMatchObject({ rule: 'address', restaurant: alma7 })
    expect(
      closestRestaurant({ address: 'Kasteelpark Arenberg 1 - 3001 Heverlee' }, [
        noCoords(alma1),
        noCoords(alma3),
      ])
    ).toMatchObject({ rule: 'address', restaurant: { id: '3' } })
  })

  it('matches addresses without caring about case or accents', () => {
    expect(
      closestRestaurant({ name: 'CELESTIJNENLAAN 10, 3001 Héverlee' }, [
        alma1,
        alma7,
      ])
    ).toMatchObject({ rule: 'address', restaurant: alma7 })
  })

  it('falls back to the first candidate when nothing matches', () => {
    expect(closestRestaurant({ name: 'V1.12' }, [alma1, alma3])).toMatchObject({
      rule: 'first-open',
      restaurant: alma1,
    })
    expect(closestRestaurant(undefined, [alma3, alma1])).toMatchObject({
      rule: 'first-open',
      restaurant: alma3,
    })
  })
})
