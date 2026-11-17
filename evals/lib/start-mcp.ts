import { spawn, type ChildProcess } from 'node:child_process'
import { join } from 'node:path'

export const EVAL_MCP_PORT = 3102
const STARTUP_TIMEOUT_MS = 30_000

const isUp = async () => {
  try {
    await fetch(`http://localhost:${EVAL_MCP_PORT}/mcp`)
    return true
  } catch {
    return false
  }
}

/** Starts a separate MCP server on recorded fixtures for the evals. */
export default async function startMcp() {
  const server: ChildProcess = spawn('yarn', ['start'], {
    cwd: join(import.meta.dirname, '../../apps/mcp'),
    env: {
      ...process.env,
      QUIVR_MODE: 'fixtures',
      // Opt-in tool: on only when the eval run asks for it, not via .env.
      ENABLE_GENERIC_GRAPHQL: process.env.ENABLE_GENERIC_GRAPHQL ?? 'false',
      MCP_PORT: String(EVAL_MCP_PORT),
    },
    stdio: 'ignore',
  })

  const deadline = Date.now() + STARTUP_TIMEOUT_MS
  while (!(await isUp())) {
    if (Date.now() > deadline) {
      server.kill()
      throw new Error('The MCP server did not start for the evals')
    }
    await new Promise(resolve => setTimeout(resolve, 200))
  }

  return () => {
    server.kill()
  }
}
