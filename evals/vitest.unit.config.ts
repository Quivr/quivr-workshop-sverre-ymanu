import { defineConfig } from 'vitest/config'

// Unit tests of the eval helpers: no MCP server, no LLM, no API key.
export default defineConfig({
  test: { include: ['lib/**/*.spec.ts'] },
})
