import { describe, expect, it } from 'vitest'

import type { QuivrClient } from '../quivr/quivr-client.js'
import { getEventInvites } from './get-event-invites.js'
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

describe('get_event_invites', () => {
  const invites = [
    {
      id: '2',
      accepted: true,
      sender: { firstName: 'Alex' },
      event: {
        title: 'Barbecue',
        startTime: '2026-11-20T18:00:00+01:00',
        endTime: '2026-11-20T22:00:00+01:00',
        allDay: false,
        locations: [],
      },
    },
    {
      id: '1',
      accepted: false,
      sender: { firstName: 'Sam' },
      event: {
        title: 'Game night',
        startTime: '2026-11-18T20:00:00+01:00',
        endTime: '2026-11-18T23:00:00+01:00',
        allDay: false,
        locations: [{ name: 'Example Bar', address: null }],
      },
    },
  ]

  it('asks for pending invites by default and maps compact fields sorted by start', async () => {
    const calls: boolean[] = []
    const quivr = fakeQuivr({
      getReceivedEventInvites: async (showAccepted: boolean) => {
        calls.push(showAccepted)
        return { receivedEventInvites: invites } as never
      },
    })

    const result = await getEventInvites.run({ onlyPending: true }, quivr)

    expect(calls).toEqual([false])
    expect(result).toEqual([
      expect.objectContaining({
        id: '1',
        event: 'Game night',
        invitedBy: 'Sam',
        location: 'Example Bar',
        accepted: false,
      }),
      expect.objectContaining({ id: '2', invitedBy: 'Alex', accepted: true }),
    ])
  })

  it('includes accepted invites when onlyPending is false', async () => {
    const calls: boolean[] = []
    const quivr = fakeQuivr({
      getReceivedEventInvites: async (showAccepted: boolean) => {
        calls.push(showAccepted)
        return { receivedEventInvites: [] } as never
      },
    })

    expect(await getEventInvites.run({ onlyPending: false }, quivr)).toEqual([])
    expect(calls).toEqual([true])
  })
})
