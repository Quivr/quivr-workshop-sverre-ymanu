import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { QuivrClient } from '../quivr/quivr-client.js'
import { getLibraryOccupancy } from './get-library-occupancy.js'
import { getMenu } from './get-menu.js'
import { getMySchedule } from './get-my-schedule.js'
import { enabledTools, tools } from './index.js'
import { MAX_RESPONSE_CHARS, runGraphqlQuery } from './run-graphql-query.js'

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

describe('run_graphql_query', () => {
  const rawQuery = vi.fn(
    async (_query: string, _variables: object): Promise<unknown> => ({
      friendList: [{ id: '1', firstName: 'Sam' }],
    })
  )
  const quivr = fakeQuivr({ rawQuery })

  beforeEach(() => rawQuery.mockClear())

  it('passes a valid query and its variables to the client', async () => {
    const query = 'query Friends($n: Int) { friendList { id firstName } }'

    const result = await runGraphqlQuery.run(
      { query, variables: { n: 1 } },
      quivr
    )

    expect(rawQuery).toHaveBeenCalledWith(query, { n: 1 })
    expect(result).toEqual({ friendList: [{ id: '1', firstName: 'Sam' }] })
  })

  it('rejects mutations without calling the client', async () => {
    await expect(
      runGraphqlQuery.run(
        { query: 'mutation { createEvent(eventInput: {}) { id } }' },
        quivr
      )
    ).rejects.toThrow(/Only read-only queries.*mutations/)
    expect(rawQuery).not.toHaveBeenCalled()
  })

  it('rejects subscriptions', async () => {
    await expect(
      runGraphqlQuery.run({ query: 'subscription { tick }' }, quivr)
    ).rejects.toThrow(/subscriptions/)
  })

  it('rejects a mutation hidden after a query', async () => {
    await expect(
      runGraphqlQuery.run(
        {
          query:
            'query A { friendList { id } } mutation B { createEvent { id } }',
        },
        quivr
      )
    ).rejects.toThrow(/exactly one query/)
    expect(rawQuery).not.toHaveBeenCalled()
  })

  it('rejects fragment definitions', async () => {
    await expect(
      runGraphqlQuery.run(
        { query: 'query { friendList { ...F } } fragment F on Friend { id }' },
        quivr
      )
    ).rejects.toThrow(/exactly one query/)
  })

  it('returns a helpful message for a syntax error', async () => {
    await expect(
      runGraphqlQuery.run({ query: 'query { friendList { id ' }, quivr)
    ).rejects.toThrow(/not valid GraphQL: Syntax Error/)
    expect(rawQuery).not.toHaveBeenCalled()
  })

  it('rejects queries nested too deeply', async () => {
    const query = `query ${'{ a '.repeat(9)}${'}'.repeat(9)}`

    await expect(runGraphqlQuery.run({ query }, quivr)).rejects.toThrow(
      /deeper than 8/
    )
  })

  it('truncates big responses with a clear marker', async () => {
    rawQuery.mockResolvedValueOnce({
      news: [{ body: 'x'.repeat(MAX_RESPONSE_CHARS) }],
    })

    const result = await runGraphqlQuery.run(
      { query: '{ news { body } }' },
      quivr
    )

    expect(result).toMatchObject({
      truncated: true,
      note: expect.stringContaining('incomplete'),
    })
    expect((result as { partialJson: string }).partialJson).toHaveLength(
      MAX_RESPONSE_CHARS
    )
  })

  it('is only exposed when enabled', () => {
    expect(tools.map(tool => tool.name)).not.toContain('run_graphql_query')
    expect(
      enabledTools({ enableGenericGraphql: false }).map(tool => tool.name)
    ).not.toContain('run_graphql_query')
    expect(
      enabledTools({ enableGenericGraphql: true }).map(tool => tool.name)
    ).toContain('run_graphql_query')
  })
})
