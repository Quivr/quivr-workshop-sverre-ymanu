import { describe, expect, it } from 'vitest'

import type { QuivrClient } from '../quivr/quivr-client.js'
import { getLibraryOccupancy } from './get-library-occupancy.js'
import { getMenu } from './get-menu.js'
import { getMySchedule } from './get-my-schedule.js'
import { getTodayOverview } from './get-today-overview.js'

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

describe('get_today_overview', () => {
  const lesson = (title: string, start: string, end: string, loc: object) => ({
    __typename: 'Lesson',
    title,
    startTime: `2026-11-17T${start}:00+01:00`,
    endTime: `2026-11-17T${end}:00+01:00`,
    locations: [loc],
    teachers: [],
  })
  const menu = (id: string, name: string, open: boolean) => ({
    restaurants: [
      {
        id,
        name,
        openingHours: open
          ? [
              {
                day: 'x',
                data: [
                  {
                    openFrom: '2026-11-17T10:00:00Z',
                    openUntil: '2026-11-17T13:00:00Z',
                  },
                ],
              },
            ]
          : [],
        dishes: [
          {
            name: 'Lasagne. ',
            mealCategory: 'WARM_BUFFET',
            prices: [4.6],
            vegetarian: false,
            vegan: true,
            allergens: ['GLUTEN'],
          },
        ],
      },
    ],
  })
  const restaurants = [
    {
      id: '1',
      name: 'Alma 1',
      location: {
        address: 'Tiensestraat 115 - 3000 Leuven',
        latitude: 50.877,
        longitude: 4.7,
      },
    },
    {
      id: '2',
      name: 'Alma 2',
      location: {
        address: 'Celestijnenlaan 200 P - 3001 Heverlee',
        latitude: 50.86,
        longitude: 4.68,
      },
    },
  ]
  const build = (items: object[], open: Record<string, boolean>) =>
    fakeQuivr({
      getMySchedule: async () =>
        ({ scheduleItems: { scheduleItems: items } }) as never,
      listRestaurants: async () => ({ restaurants }) as never,
      getMenu: async (id: string) =>
        menu(id, `Alma ${id}`, open[id] ?? false) as never,
    })

  it('highlights the next class and returns the closest open menu', async () => {
    const quivr = build(
      [
        lesson('Databases', '09:00', '11:00', {
          name: 'Aula',
          latitude: 50.8605,
          longitude: 4.6805,
        }),
        lesson('Algebra', '14:00', '16:00', {
          name: 'Aula',
          latitude: 50.8605,
          longitude: 4.6805,
        }),
      ],
      { '1': true, '2': true }
    )

    const result = await getTodayOverview.run(
      { date: '2026-11-17', time: '11:30' },
      quivr
    )

    expect(result).toMatchObject({
      nextClass: { title: 'Algebra', status: 'upcoming' },
      schedule: [
        { title: 'Databases', next: undefined },
        { title: 'Algebra', next: true },
      ],
      match: { rule: 'distance' },
      restaurant: {
        name: 'Alma 2',
        openingHours: ['11:00-14:00'],
        dishes: [
          { name: 'Lasagne', price: 4.6, vegetarian: true, vegan: true },
        ],
      },
    })
  })

  it('skips closed restaurants when picking the closest one', async () => {
    const quivr = build(
      [
        lesson('Algebra', '14:00', '16:00', {
          name: 'Aula',
          latitude: 50.8605,
          longitude: 4.6805,
        }),
      ],
      { '1': true, '2': false }
    )

    const result = await getTodayOverview.run({ date: '2026-11-17' }, quivr)

    expect(result).toMatchObject({ restaurant: { name: 'Alma 1' } })
  })

  it('has no next class on a day without classes and uses the first open restaurant', async () => {
    const quivr = build([], { '2': true })

    const result = await getTodayOverview.run({ date: '2026-11-17' }, quivr)

    expect(result).toMatchObject({
      schedule: [],
      nextClass: null,
      match: { rule: 'first-open' },
      restaurant: { name: 'Alma 2' },
    })
  })

  it('returns no restaurant when none is open', async () => {
    const quivr = build(
      [lesson('Algebra', '14:00', '16:00', { name: 'V1.12' })],
      {}
    )

    const result = await getTodayOverview.run({ date: '2026-11-17' }, quivr)

    expect(result).toMatchObject({
      nextClass: { title: 'Algebra' },
      restaurant: null,
      match: { rule: 'none' },
    })
  })
})
