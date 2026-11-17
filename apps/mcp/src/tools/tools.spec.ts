import { describe, expect, it } from 'vitest'

import type { QuivrClient } from '../quivr/quivr-client.js'
import { getLibraryOccupancy } from './get-library-occupancy.js'
import { getMenu } from './get-menu.js'
import { getMySchedule } from './get-my-schedule.js'
import { getNews } from './get-news.js'

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

describe('get_news', () => {
  const node = (n: number, overrides: object = {}) => ({
    id: String(n),
    title: `Article ${n}`,
    subtitle: null,
    summary: `Summary ${n}`,
    content: `<p>Content ${n}</p>`,
    topic: 'Housing',
    url: `https://example.invalid/${n}`,
    datePublished: '2026-11-16T09:00:00+01:00',
    contentProviderName: 'Example Union',
    ...overrides,
  })

  const newsQuivr = (nodes: (object | null)[] | null) => {
    const calls: unknown[][] = []
    const quivr = fakeQuivr({
      getNewsTopics: async () =>
        ({ newsArticlesTopics: ['Housing', 'Sports'] }) as never,
      getNews: async (...args: unknown[]) => {
        calls.push(args)
        return { newsArticlesV2: { nodes } } as never
      },
    })
    return { quivr, calls }
  }

  it('returns compact articles with the available topics', async () => {
    const { quivr } = newsQuivr([node(1)])

    const result = await getNews.run({}, quivr)

    expect(result).toEqual({
      topic: undefined,
      topics: ['Housing', 'Sports'],
      articles: [
        {
          title: 'Article 1',
          summary: 'Summary 1',
          topic: 'Housing',
          published: '2026-11-16T09:00:00+01:00',
          url: 'https://example.invalid/1',
          source: 'Example Union',
        },
      ],
    })
  })

  it('strips html, truncates long text and caps the count', async () => {
    const long = `<p>Hello&nbsp;<b>world</b> &amp; ${'x'.repeat(500)}</p>`
    const { quivr } = newsQuivr([
      node(1, { summary: '', content: long }),
      node(2),
      node(3),
    ])

    const result = (await getNews.run({ limit: 2 }, quivr)) as {
      articles: { summary: string }[]
    }

    expect(result.articles).toHaveLength(2)
    expect(result.articles[0]?.summary).toMatch(/^Hello world & x+…$/)
    expect(result.articles[0]?.summary.length).toBeLessThanOrEqual(241)
  })

  it('maps a requested topic case-insensitively to a known topic', async () => {
    const { quivr, calls } = newsQuivr([node(1)])

    const result = await getNews.run({ topic: 'housing' }, quivr)

    expect(calls[0]?.[1]).toBe('Housing')
    expect(result).toMatchObject({ topic: 'Housing' })
  })

  it('returns no articles and the topics for an unknown topic', async () => {
    const { quivr, calls } = newsQuivr([node(1)])

    const result = await getNews.run({ topic: 'quidditch' }, quivr)

    expect(calls).toHaveLength(0)
    expect(result).toEqual({
      topic: 'quidditch',
      topics: ['Housing', 'Sports'],
      articles: [],
    })
  })

  it('handles an empty result and null nodes', async () => {
    expect(await getNews.run({}, newsQuivr([]).quivr)).toMatchObject({
      articles: [],
    })
    expect(
      await getNews.run({}, newsQuivr([null, node(1)]).quivr)
    ).toMatchObject({
      articles: [expect.objectContaining({ title: 'Article 1' })],
    })
    expect(await getNews.run({}, newsQuivr(null).quivr)).toMatchObject({
      articles: [],
    })
  })
})
