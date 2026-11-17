import { afterEach, describe, expect, it, vi } from 'vitest'

import { QuivrClient, type QuivrClientOptions } from '../quivr/quivr-client.js'
import { draftInvite } from './draft-invite.js'
import { findCommonFreeSlots } from './find-common-free-slots.js'
import { getFriends } from './get-friends.js'
import { findDish } from './find-dish.js'
import { getLibraryOccupancy } from './get-library-occupancy.js'
import { getMenu } from './get-menu.js'
import { getMySchedule } from './get-my-schedule.js'
import { sendInvite } from './send-invite.js'

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

describe('draft_invite', () => {
  const getFriendsOnly = {
    getFriends: async () =>
      ({
        friendList: [
          { id: '1', firstName: 'Alex', lastName: 'Example' },
          { id: '2', firstName: 'Sam', lastName: 'Sample' },
        ],
      }) as never,
  }
  const input = {
    friendIds: ['2', '1', '2'],
    start: '2026-11-17T11:30:00Z',
    end: '2026-11-17T12:30:00Z',
    place: 'Alma 1',
    message: 'Lasagna?',
  }

  it('returns a draft with first names and sends nothing', async () => {
    const calls: string[] = []
    const quivr = fakeQuivr(
      new Proxy(getFriendsOnly, {
        get: (target, name: string) => {
          calls.push(name)
          return target[name as keyof typeof target]
        },
      })
    )

    const result = await draftInvite.run(input, quivr)

    expect(result).toEqual({
      status: 'draft_not_sent',
      draft: {
        friends: [
          { id: '2', firstName: 'Sam' },
          { id: '1', firstName: 'Alex' },
        ],
        start: '2026-11-17T12:30:00+01:00',
        end: '2026-11-17T13:30:00+01:00',
        place: 'Alma 1',
        message: 'Lasagna?',
      },
      note: expect.stringContaining('Nothing was sent') as string,
    })
    expect(calls).toEqual(['getFriends'])
    expect(JSON.stringify(result)).not.toMatch(/Example|Sample/)
  })

  it('refuses unknown friends, bad times and an end before the start', async () => {
    const quivr = fakeQuivr(getFriendsOnly)
    await expect(
      draftInvite.run({ ...input, friendIds: ['99'] }, quivr)
    ).rejects.toThrow(/Unknown friend id.*99/)
    await expect(
      draftInvite.run({ ...input, start: 'tomorrow' }, quivr)
    ).rejects.toThrow(/start must be an ISO/)
    await expect(
      draftInvite.run({ ...input, end: input.start }, quivr)
    ).rejects.toThrow(/start must be before end/)
  })
})

describe('send_invite', () => {
  afterEach(() => vi.restoreAllMocks())

  const input = {
    friendIds: ['2', '1'],
    title: 'Lasagna lunch',
    start: '2026-11-17T11:30:00Z',
    end: '2026-11-17T12:30:00Z',
    place: 'Alma 1',
    message: 'Lasagna?',
    confirmed: true as const,
  }
  const friendList = [
    { id: '1', firstName: 'Alex', lastName: 'Example' },
    { id: '2', firstName: 'Sam', lastName: 'Sample' },
  ]

  const writableFake = (calls: [string, unknown[]][], failInvites = false) => {
    const record =
      <T>(name: string, result: T) =>
      (...args: unknown[]) => {
        calls.push([name, args])
        return Promise.resolve(result)
      }
    return fakeQuivr({
      assertCanWrite: (name: string) =>
        void calls.push(['assertCanWrite', [name]]),
      getFriends: record('getFriends', { friendList }) as never,
      getEventSchedules: record('getEventSchedules', {
        schedules: [{ id: '77', title: 'My events' }],
      }) as never,
      createEvent: record('createEvent', {
        createEvent: [{ id: '500' }],
      }) as never,
      createEventInvites: (...args: unknown[]) => {
        calls.push(['createEventInvites', args])
        return failInvites
          ? Promise.reject(new Error('backend down'))
          : Promise.resolve({ createEventInvites: [] })
      },
    } as unknown as Partial<QuivrClient>)
  }

  const realClient = (options: Partial<QuivrClientOptions>) =>
    new QuivrClient({
      mode: 'live',
      readOnly: true,
      baseUrl: 'https://quivr.test',
      credentials: () => ({ authorization: 'Bearer t' }),
      ...options,
    })

  it('creates the event and invites the friends once confirmed', async () => {
    const calls: [string, unknown[]][] = []

    const result = await sendInvite.run(input, writableFake(calls))

    expect(result).toEqual({
      status: 'sent',
      event: {
        id: '500',
        title: 'Lasagna lunch',
        place: 'Alma 1',
        start: '2026-11-17T12:30:00+01:00',
        end: '2026-11-17T13:30:00+01:00',
      },
      invited: ['Sam', 'Alex'],
    })
    expect(calls.map(([name]) => name)).toEqual([
      'assertCanWrite',
      'getFriends',
      'getEventSchedules',
      'createEvent',
      'createEventInvites',
    ])
    expect(calls.find(([name]) => name === 'createEvent')?.[1]).toEqual([
      {
        scheduleId: '77',
        title: 'Lasagna lunch',
        startTime: '2026-11-17T12:30:00+01:00',
        endTime: '2026-11-17T13:30:00+01:00',
        notes: 'Lasagna?',
        locations: [{ name: 'Alma 1' }],
        private: true,
      },
    ])
    expect(calls.find(([name]) => name === 'createEventInvites')?.[1]).toEqual([
      '500',
      ['2', '1'],
    ])
  })

  it('does nothing without the confirmation', async () => {
    const calls: [string, unknown[]][] = []

    await expect(
      sendInvite.run(
        { ...input, confirmed: false } as never,
        writableFake(calls)
      )
    ).rejects.toThrow(/not confirmed/)
    expect(calls).toEqual([])
  })

  it('fails with the read-only message and sends nothing', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch')

    await expect(sendInvite.run(input, realClient({}))).rejects.toThrow(
      /QUIVR_READ_ONLY=true/
    )
    expect(fetch).not.toHaveBeenCalled()
  })

  it('reports "not sent" in fixtures mode and never touches the network', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch')

    const result = await sendInvite.run(
      input,
      realClient({ mode: 'fixtures', readOnly: false })
    )

    expect(result).toMatchObject({
      status: 'not_sent',
      reason: 'fixtures mode',
    })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('refuses unknown friends before creating anything', async () => {
    const calls: [string, unknown[]][] = []

    await expect(
      sendInvite.run({ ...input, friendIds: ['99'] }, writableFake(calls))
    ).rejects.toThrow(/Unknown friend id.*99/)
    expect(calls.map(([name]) => name)).not.toContain('createEvent')
  })

  it('says so when the event exists but the invitations failed', async () => {
    const calls: [string, unknown[]][] = []

    await expect(
      sendInvite.run(input, writableFake(calls, true))
    ).rejects.toThrow(/event was created \(id 500\).*NOT sent.*backend down/)
  })
})
