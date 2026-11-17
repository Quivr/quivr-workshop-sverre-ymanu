import { describe, expect, it } from 'vitest'

import type { QuivrClient } from '../quivr/quivr-client.js'
import { getLibraryOccupancy } from './get-library-occupancy.js'
import { getMenu } from './get-menu.js'
import { getMySchedule } from './get-my-schedule.js'
import { getStudentBars } from './get-student-bars.js'

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

describe('get_student_bars', () => {
  const bar = (
    id: string,
    name: string,
    busyness: string,
    description = ''
  ) => ({
    id,
    name,
    description,
    fakbarData: { busyness },
  })
  const open = [bar('1', 'Bar A', 'GREEN', ' Cheap beer. ')]
  const all = [...open, bar('2', 'Bar B', 'CLOSED')]
  const fakeBars = (calls: boolean[] = []) =>
    fakeQuivr({
      getStudentBars: async (onlyShowOpen: boolean) => {
        calls.push(onlyShowOpen)
        return { fakbars: onlyShowOpen ? open : all } as never
      },
    })

  it('returns only the open bars by default', async () => {
    const calls: boolean[] = []
    const result = await getStudentBars.run({}, fakeBars(calls))

    expect(calls).toEqual([true])
    expect(result).toMatchObject({
      bars: [
        {
          id: '1',
          name: 'Bar A',
          open: true,
          busyness: 'quiet',
          description: 'Cheap beer.',
        },
      ],
    })
  })

  it('flags closed bars when onlyOpen is false', async () => {
    const result = await getStudentBars.run({ onlyOpen: false }, fakeBars())

    expect(result).toMatchObject({
      bars: [
        { name: 'Bar A', open: true },
        { name: 'Bar B', open: false, busyness: undefined },
      ],
    })
  })

  it('returns an empty list when no bar is open', async () => {
    const quivr = fakeQuivr({
      getStudentBars: async () => ({ fakbars: [] }) as never,
    })

    const result = await getStudentBars.run({}, quivr)

    expect(result).toMatchObject({ bars: [] })
  })

  it('shortens long descriptions', async () => {
    const quivr = fakeQuivr({
      getStudentBars: async () =>
        ({ fakbars: [bar('1', 'Bar A', 'RED', 'x'.repeat(500))] }) as never,
    })

    const { bars } = (await getStudentBars.run({}, quivr)) as {
      bars: { description: string; busyness: string }[]
    }

    expect(bars[0]?.description).toHaveLength(201)
    expect(bars[0]?.busyness).toBe('very busy')
  })
})
