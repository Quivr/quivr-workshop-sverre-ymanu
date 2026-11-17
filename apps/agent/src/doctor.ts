import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { createMCPClient } from '@ai-sdk/mcp'
import { generateText } from 'ai'
import { loadConfig as loadQuivrConfig, readCredentials } from 'mcp/config'

import { config, ROOT_DIR } from './config.js'
import { languageModel } from './models.js'

type Check = { name: string; run: () => Promise<string> }

const green = (text: string) => `\x1b[32m${text}\x1b[0m`
const red = (text: string) => `\x1b[31m${text}\x1b[0m`

const fail = (message: string, hint: string): never => {
  throw new Error(`${message}\n      → ${hint}`)
}

const isLive = config.quivrMode === 'live'

const checks: Check[] = [
  {
    name: 'Node version',
    run: async () => {
      const wanted = readFileSync(join(ROOT_DIR, '.nvmrc'), 'utf8').trim()
      const major = (version: string) => version.replace('v', '').split('.')[0]
      if (major(process.version) !== major(wanted)) {
        fail(`Node ${process.version}, expected ${wanted}`, 'Run `just setup`')
      }
      return process.version
    },
  },
  {
    name: 'Environment',
    run: async () => {
      if (!existsSync(join(ROOT_DIR, '.env'))) {
        fail('No .env file', 'Run `cp .env.example .env`')
      }
      if (!process.env.ANTHROPIC_API_KEY) {
        fail('ANTHROPIC_API_KEY is empty', 'Add your group key to .env')
      }
      const usesOpenAI = [...config.allowedModels, config.judgeModel].some(id =>
        id.startsWith('openai:')
      )
      if (usesOpenAI && !process.env.OPENAI_API_KEY) {
        fail(
          'OPENAI_API_KEY is empty, but an openai: model is configured',
          'Add the key to .env, or remove openai: models from ALLOWED_MODELS / JUDGE_MODEL'
        )
      }
      if (!config.allowedModels.includes(config.defaultModel)) {
        fail(
          `DEFAULT_MODEL "${config.defaultModel}" is not in ALLOWED_MODELS`,
          'Fix ALLOWED_MODELS / DEFAULT_MODEL in .env'
        )
      }
      return `QUIVR_MODE=${config.quivrMode}, QUIVR_READ_ONLY=${process.env.QUIVR_READ_ONLY ?? 'true'}`
    },
  },
  {
    name: 'Anthropic API',
    run: async () => {
      try {
        await generateText({
          model: languageModel(config.defaultModel),
          prompt: 'Reply with OK.',
          maxOutputTokens: 5,
        })
      } catch (error) {
        fail(
          error instanceof Error ? error.message : String(error),
          'Check ANTHROPIC_API_KEY and DEFAULT_MODEL in .env'
        )
      }
      return `${config.defaultModel} answers`
    },
  },
  {
    name: 'Quivr backend',
    run: async () => {
      if (!isLive) {
        if (!existsSync(config.fixturesMetaFile)) {
          fail('No fixtures recorded', 'Run `just record-fixtures`')
        }
        return 'skipped (fixtures mode)'
      }
      const { baseUrl } = loadQuivrConfig()
      const credentials = readCredentials()
      if (!credentials) {
        fail('Not logged in', 'Run `just login` (or set QUIVR_MODE=fixtures)')
      }
      const response = await fetch(`${baseUrl}/graphql`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...credentials },
        body: JSON.stringify({ query: '{ user { firstName } }' }),
      }).catch(() =>
        fail(
          `Cannot reach ${baseUrl}`,
          'Check your internet connection, or use QUIVR_MODE=fixtures'
        )
      )
      const body = (await response.json()) as {
        data?: { user: { firstName: string } | null }
      }
      if (!body.data?.user) {
        fail('Quivr rejected the token', 'Run `just login` again')
      }
      return `logged in as ${body.data?.user?.firstName}`
    },
  },
  {
    name: 'MCP server',
    run: async () => {
      const mcp = await createMCPClient({
        transport: { type: 'http', url: config.mcpUrl },
      }).catch(() =>
        fail(
          `Cannot reach ${config.mcpUrl}`,
          'Start everything with `just dev`'
        )
      )
      const tools = Object.keys(await mcp.tools())
      await mcp.close()
      return tools.join(', ')
    },
  },
]

let failures = 0
for (const check of checks) {
  try {
    console.info(`${green('✔')} ${check.name}: ${await check.run()}`)
  } catch (error) {
    failures += 1
    console.info(`${red('✖')} ${check.name}: ${(error as Error).message}`)
  }
}
console.info(
  failures ? red(`\n${failures} check(s) failed.`) : green('\nAll good!')
)
process.exit(failures ? 1 : 0)
