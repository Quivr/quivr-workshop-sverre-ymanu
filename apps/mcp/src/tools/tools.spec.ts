import { describe, expect, it } from 'vitest'

import type { QuivrClient } from '../quivr/quivr-client.js'
import { findCommonFreeSlots } from './find-common-free-slots.js'
import { getFriends } from './get-friends.js'
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

describe('get_friends', () => {
  it('returns id and names', async () => {
    const quivr = fakeQuivr({
      getFriends: async () =>
        ({
          friendList: [
            { id: '1', firstName: 'Alex', lastName: 'Example', extra: 'x' },
          ],
        }) as never,
    })

    expect(await getFriends.run({}, quivr)).toEqual([
      { id: '1', firstName: 'Alex', lastName: 'Example' },
    ])
  })
})

describe('find_common_free_slots', () => {
  const friendList = [
    { id: '1', firstName: 'Alex', lastName: 'Example' },
    { id: '2', firstName: 'Sam', lastName: 'Sample' },
  ]
  const item = (startTime: string, endTime: string, allDay = false) => ({
    id: startTime,
    title: 'Secret title',
    startTime,
    endTime,
    allDay,
  })
  const schedules: Record<string, object[]> = {
    '1': [item('2026-11-17T09:00:00+01:00', '2026-11-17T12:00:00+01:00')],
    '2': [],
  }
  const quivr = fakeQuivr({
    getFriends: async () => ({ friendList }) as never,
    getMySchedule: async () =>
      ({
        scheduleItems: {
          scheduleItems: [
            item('2026-11-17T11:00:00+01:00', '2026-11-17T14:00:00+01:00'),
          ],
        },
      }) as never,
    getFriendSchedules: async (ids: string[]) =>
      ({
        friendSchedules: ids.map(id => ({
          friendId: id,
          scheduleItems: schedules[id] ?? [],
        })),
      }) as never,
  })

  it('finds the gaps everyone shares and only returns slots and first names', async () => {
    const result = await findCommonFreeSlots.run(
      { friendIds: ['2', '1'], date: '2026-11-17', minMinutes: 60 },
      quivr
    )

    expect(result).toMatchObject({
      participants: ['you', 'Alex', 'Sam'],
      slots: [
        {
          start: '2026-11-17T08:00:00+01:00',
          end: '2026-11-17T09:00:00+01:00',
          minutes: 60,
        },
        {
          start: '2026-11-17T14:00:00+01:00',
          end: '2026-11-17T20:00:00+01:00',
          minutes: 360,
        },
      ],
      sharedNothing: ['Sam'],
    })
    expect(JSON.stringify(result)).not.toMatch(/Secret|Example|Sample/)
  })

  it('treats a friend all-day item as busy for the whole day', async () => {
    schedules['2'] = [
      item('2026-11-17T00:00:00+01:00', '2026-11-18T00:00:00+01:00', true),
    ]
    const result = await findCommonFreeSlots.run(
      { friendIds: ['2'], date: '2026-11-17' },
      quivr
    )
    schedules['2'] = []

    expect(result).toMatchObject({ slots: [], sharedNothing: [] })
  })

  it('refuses ids that are not friends', async () => {
    await expect(
      findCommonFreeSlots.run({ friendIds: ['99'], date: '2026-11-17' }, quivr)
    ).rejects.toThrow(/Unknown friend id.*99/)
  })
})
