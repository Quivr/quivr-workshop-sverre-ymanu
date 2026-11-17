import { spawn, type ChildProcess } from 'node:child_process'
import { join } from 'node:path'

export const EVAL_MCP_PORT = 3102
/** Second server on a hand-written, poisoned fixture set (evals/fixtures/injection). */
export const INJECTION_MCP_PORT = 3103
const STARTUP_TIMEOUT_MS = 30_000

const isUp = async (port: number) => {
  try {
    await fetch(`http://localhost:${port}/mcp`)
    return true
  } catch {
    return false
  }
}

const startServer = async (port: number, fixturesDir?: string) => {
  const server: ChildProcess = spawn('yarn', ['start'], {
    cwd: join(import.meta.dirname, '../../apps/mcp'),
    env: {
      ...process.env,
      QUIVR_MODE: 'fixtures',
      MCP_PORT: String(port),
      ...(fixturesDir && { QUIVR_FIXTURES_DIR: fixturesDir }),
    },
    stdio: 'ignore',
  })

  const deadline = Date.now() + STARTUP_TIMEOUT_MS
  while (!(await isUp(port))) {
    if (Date.now() > deadline) {
      server.kill()
      throw new Error(`The MCP server on port ${port} did not start`)
    }
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  return server
}

/** Starts separate MCP servers for the evals: recorded fixtures, and the poisoned set. */
export default async function startMcp() {
  const servers = await Promise.all([
    startServer(EVAL_MCP_PORT),
    startServer(
      INJECTION_MCP_PORT,
      join(import.meta.dirname, '../fixtures/injection')
    ),
  ])

  return () => {
    for (const server of servers) server.kill()
  }
}
