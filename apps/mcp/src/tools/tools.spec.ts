import { describe, expect, it } from 'vitest'

import type { QuivrClient } from '../quivr/quivr-client.js'
import { findDish } from './find-dish.js'
import { getLibraryOccupancy } from './get-library-occupancy.js'
import { getMenu } from './get-menu.js'
import { getMySchedule } from './get-my-schedule.js'

const fakeQuivr = (overrides: Partial<QuivrClient>) =>
  overrides as unknown as QuivrClient

describe('get_my_schedule', () => {
  it('merges days, sorts by start and keeps the useful fields', async () => {
    const days: Record<string, object[]> = {
      '2026-11-13': [
        {
          __typename: 'Lesson',
          title: 'Databases',
          startTime: '2026-11-13T14:00:00+01:00',
          endTime: '2026-11-13T16:00:00+01:00',
          locations: [{ name: 'V1.12' }],
          teachers: [{ name: 'Teacher' }],
        },
        {
          __typename: 'Event',
          title: 'Sports',
          startTime: '2026-11-13T08:00:00+01:00',
          endTime: '2026-11-13T09:00:00+01:00',
          locations: [],
        },
      ],
      '2026-11-14': [],
    }
    const quivr = fakeQuivr({
      getMySchedule: async (date: string) =>
        ({ scheduleItems: { scheduleItems: days[date] ?? [] } }) as never,
    })

    const result = await getMySchedule.run(
      { from: '2026-11-13', to: '2026-11-14' },
      quivr
    )

    expect(result).toEqual([
      expect.objectContaining({ kind: 'event', title: 'Sports' }),
      expect.objectContaining({
        kind: 'class',
        title: 'Databases',
        location: 'V1.12',
        teachers: ['Teacher'],
      }),
    ])
  })

  it('refuses ranges longer than two weeks', async () => {
    await expect(
      getMySchedule.run({ from: '2026-11-01', to: '2026-12-01' }, fakeQuivr({}))
    ).rejects.toThrow(/at most 14 days/)
  })
})

describe('get_menu', () => {
  it('flattens opening hours and dishes', async () => {
    const quivr = fakeQuivr({
      getMenu: async () =>
        ({
          restaurants: [
            {
              id: '3',
              name: 'Alma 2',
              openingHours: [
                { day: 'x', data: [{ openFrom: '11:30', openUntil: '14:00' }] },
              ],
              dishes: [
                {
                  name: 'Lasagne',
                  mealCategory: 'WARM_BUFFET',
                  prices: [4.6],
                  vegetarian: true,
                  vegan: false,
                  allergens: [],
                },
              ],
            },
          ],
        }) as never,
    })

    const result = await getMenu.run(
      { restaurantId: '3', date: '2026-11-13' },
      quivr
    )

    expect(result).toMatchObject({
      restaurant: 'Alma 2',
      openingHours: ['11:30-14:00'],
      dishes: [{ name: 'Lasagne', vegetarian: true }],
    })
  })

  it('marks vegan dishes as vegetarian and trims names', async () => {
    const quivr = fakeQuivr({
      getMenu: async () =>
        ({
          restaurants: [
            {
              id: '3',
              name: 'Alma 2',
              openingHours: [],
              dishes: [
                {
                  name: 'Spaghetti bolognese. ',
                  mealCategory: 'WARM_BUFFET',
                  prices: [6.35],
                  vegetarian: false,
                  vegan: true,
                  allergens: [],
                },
              ],
            },
          ],
        }) as never,
    })

    const result = await getMenu.run(
      { restaurantId: '3', date: '2026-11-13' },
      quivr
    )

    expect(result).toMatchObject({
      dishes: [{ name: 'Spaghetti bolognese', vegetarian: true, vegan: true }],
    })
  })
})

describe('get_library_occupancy', () => {
  it('computes how full each library is', async () => {
    const quivr = fakeQuivr({
      getLibraries: async () =>
        ({
          libraries: [
            {
              id: '1',
              name: 'Agora',
              data: { occupancy: 150, capacity: 600, timestamp: 't' },
              location: null,
            },
            { id: '2', name: 'No sensor', data: null, location: null },
          ],
        }) as never,
    })

    const result = await getLibraryOccupancy.run({}, quivr)

    expect(result).toEqual([
      expect.objectContaining({ name: 'Agora', percentFull: 25 }),
      expect.objectContaining({ name: 'No sensor', percentFull: undefined }),
    ])
  })
})

describe('find_dish', () => {
  const dish = (name: string, vegetarian = false, vegan = false) => ({
    name,
    mealCategory: 'WARM_BUFFET',
    prices: [4.6, 6.1],
    vegetarian,
    vegan,
    allergens: [],
  })
  const menus: Record<string, Record<string, object[]>> = {
    '1': {
      '2026-11-17': [dish('Lasagna bolognese.'), dish('Soup')],
      '2026-11-19': [dish('Vegetable LASAGNA', true), dish('Crème brûlée')],
    },
    '2': { '2026-11-18': [dish('Vegan lasagna', false, true)] },
  }
  const quivr = fakeQuivr({
    listRestaurants: async () =>
      ({
        restaurants: [
          { id: '1', name: 'Alma 1' },
          { id: '2', name: 'Alma 2' },
        ],
      }) as never,
    getMenu: async (restaurantId: string, date: string) =>
      ({
        restaurants: [
          {
            id: restaurantId,
            name: `Alma ${restaurantId}`,
            openingHours: [],
            dishes: menus[restaurantId]?.[date] ?? [],
          },
        ],
      }) as never,
  })

  it('finds matching dishes across restaurants and days, sorted by date', async () => {
    const result = await findDish.run(
      { query: 'lasagna', from: '2026-11-17', days: 3 },
      quivr
    )

    expect(result).toMatchObject({
      from: '2026-11-17',
      to: '2026-11-19',
      totalMatches: 3,
      matches: [
        {
          date: '2026-11-17',
          restaurant: 'Alma 1',
          dish: 'Lasagna bolognese',
          vegetarian: false,
          price: 4.6,
        },
        {
          date: '2026-11-18',
          restaurant: 'Alma 2',
          dish: 'Vegan lasagna',
          vegetarian: true,
          vegan: true,
        },
        { date: '2026-11-19', dish: 'Vegetable LASAGNA', vegetarian: true },
      ],
    })
  })

  it('ignores case and accents and only looks inside the requested days', async () => {
    const accent = await findDish.run(
      { query: 'CREME brulee', from: '2026-11-17', days: 3 },
      quivr
    )
    expect(accent).toMatchObject({
      matches: [{ dish: 'Crème brûlée' }],
    })

    const outside = await findDish.run(
      { query: 'lasagna', from: '2026-11-17', days: 1 },
      quivr
    )
    expect(outside).toMatchObject({ totalMatches: 1 })
  })

  it('returns an empty list when nothing matches', async () => {
    const result = await findDish.run(
      { query: 'pizza', from: '2026-11-17', days: 7 },
      quivr
    )

    expect(result).toMatchObject({ totalMatches: 0, matches: [] })
  })
})
