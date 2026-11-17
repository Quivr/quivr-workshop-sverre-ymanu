import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  GraphQLError,
  Kind,
  parse,
  print,
  type OperationDefinitionNode,
  type SelectionSetNode,
} from 'graphql'

import { QUERIES_DIR } from '../config.js'

export const MAX_QUERY_CHARS = 4_000
export const MAX_QUERY_DEPTH = 8

const depthOf = (selectionSet: SelectionSetNode | undefined): number =>
  selectionSet
    ? 1 +
      Math.max(
        0,
        ...selectionSet.selections.map(selection =>
          selection.kind === Kind.INLINE_FRAGMENT
            ? depthOf(selection.selectionSet) - 1
            : depthOf(
                selection.kind === Kind.FIELD
                  ? selection.selectionSet
                  : undefined
              )
        )
      )
    : 0

/**
 * Accepts exactly one `query` operation and nothing else. Mutations and
 * subscriptions are rejected here regardless of QUIVR_READ_ONLY.
 */
export const parseSingleQuery = (query: string): OperationDefinitionNode => {
  if (query.length > MAX_QUERY_CHARS) {
    throw new Error(
      `Query is ${query.length} characters, the limit is ${MAX_QUERY_CHARS}. Ask for fewer fields.`
    )
  }

  let document
  try {
    document = parse(query)
  } catch (error) {
    const detail = error instanceof GraphQLError ? error.message : String(error)
    throw new Error(`The query is not valid GraphQL: ${detail}`, {
      cause: error,
    })
  }

  const [operation, ...rest] = document.definitions
  if (!operation || rest.length > 0) {
    throw new Error(
      'Send exactly one query operation. Multiple operations and fragment definitions are not supported: write the fields inline.'
    )
  }
  if (operation.kind !== Kind.OPERATION_DEFINITION) {
    throw new Error(
      'Send a query operation, not a fragment or type definition.'
    )
  }
  if (operation.operation !== 'query') {
    throw new Error(
      `Only read-only queries are allowed, not ${operation.operation}s.`
    )
  }
  if (depthOf(operation.selectionSet) > MAX_QUERY_DEPTH) {
    throw new Error(
      `Query is nested deeper than ${MAX_QUERY_DEPTH} levels. Ask for less nested data.`
    )
  }
  return operation
}

type RecordedQuery = { name: string; text: string }

const recordedQueries = (): RecordedQuery[] =>
  readdirSync(QUERIES_DIR)
    .filter(file => file.endsWith('.graphql'))
    .map(file => ({
      name: file.replace(/\.graphql$/, ''),
      text: readFileSync(join(QUERIES_DIR, file), 'utf8'),
    }))

/**
 * In QUIVR_MODE=fixtures only the recorded operations have data. Returns the
 * name of the recorded operation whose text equals `query` (ignoring
 * formatting), or explains what is available.
 */
export const findRecordedOperation = (query: string): string => {
  const wanted = print(parse(query))
  const recorded = recordedQueries()
  const match = recorded.find(({ text }) => print(parse(text)) === wanted)
  if (match) return match.name
  throw new Error(
    [
      'Arbitrary queries need QUIVR_MODE=live: in QUIVR_MODE=fixtures there is only recorded data.',
      'In fixtures mode you can only send one of these recorded queries unchanged:',
      ...recorded.map(({ text }) => text.trim()),
    ].join('\n\n')
  )
}
