import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseEnv } from 'node:util'

export const ROOT_DIR = join(import.meta.dirname, '../../..')
export const ENV_FILE = join(ROOT_DIR, '.env')
export const QUERIES_DIR = join(import.meta.dirname, 'quivr/queries')

if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE)

/** Recorded responses for QUIVR_MODE=fixtures. QUIVR_FIXTURES_DIR swaps in another set (the injection evals). */
export const FIXTURES_DIR =
  process.env.QUIVR_FIXTURES_DIR ?? join(import.meta.dirname, '../fixtures')

export type QuivrMode = 'live' | 'fixtures'

export type Config = {
  port: number
  mode: QuivrMode
  readOnly: boolean
  baseUrl: string
}

export const loadConfig = (): Config => ({
  port: Number(process.env.MCP_PORT ?? 3002),
  mode: process.env.QUIVR_MODE === 'fixtures' ? 'fixtures' : 'live',
  readOnly: process.env.QUIVR_READ_ONLY !== 'false',
  baseUrl: process.env.QUIVR_BASE_URL ?? 'https://rails-beta.quivr.be',
})

/** Auth headers to send with every Quivr request. */
export type QuivrCredentials = Record<string, string>

/**
 * Builds the auth headers from `.env` values. Quivr accepts either the
 * `Authorization` header from the login response or the three devise_token_auth
 * headers; both are sent when present.
 */
export const credentialsFrom = (
  env: Record<string, string | undefined>
): QuivrCredentials | undefined => {
  const legacy =
    env.QUIVR_UID && env.QUIVR_CLIENT && env.QUIVR_ACCESS_TOKEN
      ? {
          uid: env.QUIVR_UID,
          client: env.QUIVR_CLIENT,
          'access-token': env.QUIVR_ACCESS_TOKEN,
        }
      : undefined
  if (!env.QUIVR_AUTHORIZATION && !legacy) return undefined
  return {
    ...legacy,
    ...(env.QUIVR_AUTHORIZATION && { authorization: env.QUIVR_AUTHORIZATION }),
  }
}

/**
 * Re-reads `.env` on every call, so `just login` works without restarting.
 */
export const readCredentials = (): QuivrCredentials | undefined => {
  const fromFile = existsSync(ENV_FILE)
    ? parseEnv(readFileSync(ENV_FILE, 'utf8'))
    : {}
  return credentialsFrom({ ...process.env, ...fromFile })
}
