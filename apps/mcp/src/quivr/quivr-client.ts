import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { Kind, parse, type OperationDefinitionNode } from 'graphql'

import {
  QUERIES_DIR,
  readCredentials,
  type Config,
  type QuivrCredentials,
} from '../config.js'
import type {
  FriendListQuery,
  FriendSchedulesQuery,
  LibrariesQuery,
  MenuQuery,
  MyScheduleQuery,
  RestaurantsQuery,
} from './__generated__/graphql.js'
import { dayRange } from './dates.js'
import { readFixture } from './fixtures.js'

const REQUEST_TIMEOUT_MS = 10_000

export type QuivrClientOptions = Pick<
  Config,
  'mode' | 'readOnly' | 'baseUrl'
> & {
  credentials?: () => QuivrCredentials | undefined
  onResponse?: (operationName: string, variables: object, data: unknown) => void
}

type GraphQLResponse<T> = {
  data?: T
  errors?: { message: string }[]
}

/**
 * The only place that talks to the Quivr backend.
 * One method per GraphQL operation in `queries/<OperationName>.graphql`.
 */
export class QuivrClient {
  constructor(private readonly options: QuivrClientOptions) {}

  getMySchedule(date: string): Promise<MyScheduleQuery> {
    return this.request('MySchedule', { timeRange: dayRange(date) })
  }

  listRestaurants(): Promise<RestaurantsQuery> {
    return this.request('Restaurants', {})
  }

  getMenu(restaurantId: string, date: string): Promise<MenuQuery> {
    return this.request('Menu', { restaurantId, timeRange: dayRange(date) })
  }

  getLibraries(): Promise<LibrariesQuery> {
    return this.request('Libraries', {})
  }

  getFriends(): Promise<FriendListQuery> {
    return this.request('FriendList', {})
  }

  getFriendSchedules(
    friendIds: string[],
    date: string
  ): Promise<FriendSchedulesQuery> {
    return this.request('FriendSchedules', {
      friendIds,
      timeRange: dayRange(date),
    })
  }

  async request<T>(operationName: string, variables: object): Promise<T> {
    const query = readFileSync(
      join(QUERIES_DIR, `${operationName}.graphql`),
      'utf8'
    )
    this.assertAllowed(operationName, query)

    if (this.options.mode === 'fixtures') {
      return readFixture(operationName, variables) as T
    }

    const data = await this.send<T>(operationName, query, variables)
    this.options.onResponse?.(operationName, variables, data)
    return data
  }

  private assertAllowed(operationName: string, query: string) {
    const operation = parse(query).definitions.find(
      (definition): definition is OperationDefinitionNode =>
        definition.kind === Kind.OPERATION_DEFINITION
    )
    if (!operation) throw new Error(`${operationName} has no operation`)
    if (operation.operation === 'subscription') {
      throw new Error(`${operationName}: subscriptions are not supported`)
    }
    if (operation.operation === 'mutation' && this.options.readOnly) {
      throw new Error(
        `${operationName} is a mutation and QUIVR_READ_ONLY=true. Set QUIVR_READ_ONLY=false in .env to allow writes.`
      )
    }
  }

  private async send<T>(
    operationName: string,
    query: string,
    variables: object
  ): Promise<T> {
    const credentials = (this.options.credentials ?? readCredentials)()
    if (!credentials) {
      throw new Error(
        'Not logged in to Quivr. Run `just login`, or set QUIVR_MODE=fixtures.'
      )
    }

    const response = await fetch(`${this.options.baseUrl}/graphql`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...credentials,
      },
      body: JSON.stringify({ operationName, query, variables }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    if (response.status === 401) {
      throw new Error('Quivr rejected the login token. Run `just login` again.')
    }
    if (!response.ok) {
      throw new Error(`Quivr backend returned HTTP ${response.status}`)
    }

    const body = (await response.json()) as GraphQLResponse<T>
    if (body.errors?.length) {
      throw new Error(body.errors.map(error => error.message).join('; '))
    }
    if (!body.data) throw new Error(`${operationName} returned no data`)
    return body.data
  }
}
