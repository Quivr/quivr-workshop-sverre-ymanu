import { afterEach, describe, expect, it, vi } from 'vitest'

import { credentialsFrom } from '../config.js'
import {
  FixturesModeError,
  QuivrClient,
  type QuivrClientOptions,
} from './quivr-client.js'

const QUERIES = {
  CreateEvent: 'mutation CreateEvent { createEvent { id } }',
  Restaurants: 'query Restaurants { restaurants { id } }',
}

vi.mock('node:fs', async importOriginal => {
  const fs = await importOriginal<typeof import('node:fs')>()
  return {
    ...fs,
    readFileSync: (path: string, encoding: BufferEncoding) => {
      const name = Object.keys(QUERIES).find(op =>
        path.endsWith(`${op}.graphql`)
      )
      return name
        ? QUERIES[name as keyof typeof QUERIES]
        : fs.readFileSync(path, encoding)
    },
  }
})

const client = (options: Partial<QuivrClientOptions> = {}) =>
  new QuivrClient({
    mode: 'live',
    readOnly: true,
    baseUrl: 'https://quivr.test',
    credentials: () => ({ authorization: 'Bearer t' }),
    ...options,
  })

const respondWith = (data: unknown) =>
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ data }))

describe('QuivrClient', () => {
  afterEach(() => vi.restoreAllMocks())

  it('rejects mutations when read-only, without calling the backend', async () => {
    const fetch = respondWith({})

    await expect(client().request('CreateEvent', {})).rejects.toThrow(
      /QUIVR_READ_ONLY=true/
    )
    expect(fetch).not.toHaveBeenCalled()
  })

  it('sends mutations when read-only is off', async () => {
    const fetch = respondWith({ createEvent: { id: '1' } })

    const data = await client({ readOnly: false }).request('CreateEvent', {})

    expect(data).toEqual({ createEvent: { id: '1' } })
    expect(fetch).toHaveBeenCalledOnce()
  })

  it('never sends mutations in fixtures mode, even when read-only is off', async () => {
    const fetch = respondWith({})

    await expect(
      client({ mode: 'fixtures', readOnly: false }).request('CreateEvent', {})
    ).rejects.toThrow(FixturesModeError)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('keeps the read-only message first when both apply', () => {
    expect(() =>
      client({ mode: 'fixtures' }).assertCanWrite('CreateEvent')
    ).toThrow(/QUIVR_READ_ONLY=true/)
  })

  it('sends the auth headers with queries', async () => {
    const fetch = respondWith({ restaurants: [] })

    await client().request('Restaurants', {})

    const init = fetch.mock.calls[0]?.[1]
    expect(init?.headers).toMatchObject({ authorization: 'Bearer t' })
  })

  it('explains how to log in when there is no token', async () => {
    await expect(
      client({ credentials: () => undefined }).request('Restaurants', {})
    ).rejects.toThrow(/just login/)
  })
})

describe('QuivrClient.rawQuery', () => {
  afterEach(() => vi.restoreAllMocks())

  it('sends a valid query, even when read-only', async () => {
    const fetch = respondWith({ friendList: [] })

    const data = await client().rawQuery('query Friends { friendList { id } }')

    expect(data).toEqual({ friendList: [] })
    const body = JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))
    expect(body.operationName).toBe('Friends')
  })

  it('rejects mutations even when QUIVR_READ_ONLY=false', async () => {
    const fetch = respondWith({})

    await expect(
      client({ readOnly: false }).rawQuery('mutation { createEvent { id } }')
    ).rejects.toThrow(/read-only/)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('explains that raw queries need live mode in fixtures mode', async () => {
    const fetch = respondWith({})

    await expect(
      client({ mode: 'fixtures' }).rawQuery('{ friendList { id } }')
    ).rejects.toThrow(/QUIVR_MODE=live/)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('accepts a recorded query in fixtures mode, whatever its formatting', async () => {
    await expect(
      client({ mode: 'fixtures' }).rawQuery(
        'query   Libraries{libraries{id name data{capacity occupancy timestamp} location{address}}}'
      )
    ).resolves.toBeDefined()
  })
})

describe('credentialsFrom', () => {
  it('uses the Authorization header from the login response', () => {
    expect(credentialsFrom({ QUIVR_AUTHORIZATION: 'Bearer t' })).toEqual({
      authorization: 'Bearer t',
    })
  })

  it('falls back to the three devise token headers', () => {
    expect(
      credentialsFrom({
        QUIVR_UID: 'student@example.com',
        QUIVR_CLIENT: 'c',
        QUIVR_ACCESS_TOKEN: 't',
      })
    ).toEqual({ uid: 'student@example.com', client: 'c', 'access-token': 't' })
  })

  it('is undefined when the devise headers are incomplete', () => {
    expect(
      credentialsFrom({ QUIVR_UID: 'student@example.com' })
    ).toBeUndefined()
  })
})
