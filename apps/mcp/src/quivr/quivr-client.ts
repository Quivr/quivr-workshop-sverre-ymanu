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
  CreateEventInvitesMutation,
  CreateEventMutation,
  EventInput,
  EventSchedulesQuery,
  FriendListQuery,
  FriendSchedulesQuery,
  FakbarsQuery,
  LibrariesQuery,
  MenuQuery,
  MyScheduleQuery,
  NewsQuery,
  NewsTopicsQuery,
  PartnerCardsQuery,
  RestaurantsQuery,
} from './__generated__/graphql.js'
import { dayRange } from './dates.js'
import { readFixture } from './fixtures.js'
import { findRecordedOperation, parseSingleQuery } from './raw-query.js'

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

/** A mutation was asked for while running on recorded fixtures: nothing is sent. */
export class FixturesModeError extends Error {
  constructor(operationName: string) {
    super(
      `${operationName} is a mutation and QUIVR_MODE=fixtures: nothing was sent. Use QUIVR_MODE=live (and QUIVR_READ_ONLY=false) to really write.`
    )
    this.name = 'FixturesModeError'
  }
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

  getNews(first: number, topic?: string): Promise<NewsQuery> {
    return this.request('News', { first, topic: topic ?? null })
  }

  getNewsTopics(): Promise<NewsTopicsQuery> {
    return this.request('NewsTopics', {})
  }

  getStudentBars(onlyShowOpen: boolean): Promise<FakbarsQuery> {
    return this.request('Fakbars', { onlyShowOpen })
  }

  getPartnerCards(first: number): Promise<PartnerCardsQuery> {
    return this.request('PartnerCards', { first })
  }

  /**
   * Runs one arbitrary read-only query. Only `query` operations are accepted,
   * whatever QUIVR_READ_ONLY says. Used by the opt-in `run_graphql_query` tool.
   */
  async rawQuery(query: string, variables: object = {}): Promise<unknown> {
    const operation = parseSingleQuery(query)

    if (this.options.mode === 'fixtures') {
      return readFixture(findRecordedOperation(query), variables)
    }
    return this.send(operation.name?.value, query, variables)
  }

  getEventSchedules(): Promise<EventSchedulesQuery> {
    return this.request('EventSchedules', {})
  }

  /** Mutation: only works with QUIVR_READ_ONLY=false in live mode. */
  createEvent(eventInput: EventInput): Promise<CreateEventMutation> {
    return this.request('CreateEvent', { eventInput })
  }

  /** Mutation: notifies the recipients. Only works with QUIVR_READ_ONLY=false in live mode. */
  createEventInvites(
    eventId: string,
    recipientIds: string[]
  ): Promise<CreateEventInvitesMutation> {
    return this.request('CreateEventInvites', {
      eventInvitesInput: { eventId, recipientIds },
    })
  }

  /**
   * Call before doing any work for a write, so it fails before anything is
   * read or sent. Same checks `request` applies to every mutation.
   */
  assertCanWrite(operationName: string) {
    this.assertMutationAllowed(operationName)
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
    if (operation.operation === 'mutation') {
      this.assertMutationAllowed(operationName)
    }
  }

  private assertMutationAllowed(operationName: string) {
    if (this.options.readOnly) {
      throw new Error(
        `${operationName} is a mutation and QUIVR_READ_ONLY=true. Set QUIVR_READ_ONLY=false in .env to allow writes.`
      )
    }
    if (this.options.mode === 'fixtures') {
      throw new FixturesModeError(operationName)
    }
  }

  private async send<T>(
    operationName: string | undefined,
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
    if (!body.data)
      throw new Error(`${operationName ?? 'The query'} returned no data`)
    return body.data
  }
}
