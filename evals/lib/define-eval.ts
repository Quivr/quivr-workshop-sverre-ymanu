import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { config } from 'agent/config'
import { afterAll, describe, expect, it } from 'vitest'

import { askAgent } from './run.js'
import {
  avoidedTools,
  avoidsText,
  doesNotContain,
  includesFacts,
  judge,
  maxWords,
  onlyUsedTools,
  usedTools,
  type Score,
} from './scorers.js'

export type EvalCase = {
  name: string
  question: string
  /** Reference answer for the LLM judge. */
  expected: string
  /** Strings or regexes that must appear in the answer. */
  facts?: (string | RegExp)[]
  /** Tools the agent must call. */
  tools?: string[]
  /** If set, the agent may call only these tools. */
  onlyTools?: string[]
  /** Strings or regexes that must not appear in the answer. */
  forbidden?: (string | RegExp)[]
  /** MCP server port to use instead of the default fixtures server. */
  mcpPort?: number
  /** Tools the agent must not call. */
  forbiddenTools?: string[]
  /** Patterns that must not appear in the answer. */
  avoid?: RegExp[]
  /** The answer may have at most this many words. */
  maxWords?: number
}

type CaseResult = {
  case: string
  model: string
  answer: string
  scores: Score[]
}

const RESULTS_DIR = join(import.meta.dirname, '../results')

/** Models to evaluate: EVAL_MODELS=a,b or every allowed model. */
const models = () =>
  (process.env.EVAL_MODELS ?? config.allowedModels.join(','))
    .split(',')
    .map(model => model.trim())
    .filter(Boolean)

const average = (results: CaseResult[], name: string) => {
  const values = results.flatMap(r =>
    r.scores.filter(s => s.name === name).map(s => s.score)
  )
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : NaN
}

/**
 * One eval suite: runs every case on every model, scores it, and fails a case
 * when a deterministic check (facts, tools) is not fully met.
 */
export const defineEval = (
  suite: string,
  cases: EvalCase[],
  options: {
    /** Expose only these tools to the agent. Default: all tools. */
    onlyTools?: string[]
    /** Skip the suite, with the reason shown in the output. */
    skip?: string
  } = {}
) => {
  if (options.skip) {
    describe.skip(`${suite} (${options.skip})`, () => it('skipped', () => {}))
    return
  }
  const results: CaseResult[] = []

  for (const model of models()) {
    describe(`${suite} · ${model}`, () => {
      it.each(cases)('$name', async evalCase => {
        const result = await askAgent(
          evalCase.question,
          model,
          evalCase.mcpPort,
          options.onlyTools
        )
        const scores = [
          includesFacts(result, evalCase.facts ?? []),
          usedTools(result, evalCase.tools ?? []),
          ...(evalCase.onlyTools
            ? [onlyUsedTools(result, evalCase.onlyTools)]
            : []),
          ...(evalCase.forbidden
            ? [doesNotContain(result, evalCase.forbidden)]
            : []),
          avoidedTools(result, evalCase.forbiddenTools ?? []),
          avoidsText(result, evalCase.avoid ?? []),
          ...(evalCase.maxWords !== undefined
            ? [maxWords(result, evalCase.maxWords)]
            : []),
          await judge(evalCase.question, evalCase.expected, result),
        ]
        results.push({
          case: evalCase.name,
          model,
          answer: result.text,
          scores,
        })

        const report = scores
          .map(s => `${s.name}=${s.score.toFixed(2)} (${s.reason})`)
          .join('\n  ')
        console.info(
          `[${model}] ${evalCase.name}\n  ${report}\n  answer: ${result.text.slice(0, 300)}`
        )
        for (const score of scores.filter(s => s.name !== 'judge')) {
          expect(score.score, `${score.name}: ${score.reason}`).toBe(1)
        }
      })
    })
  }

  afterAll(() => {
    const summary = models().map(model => {
      const forModel = results.filter(r => r.model === model)
      return {
        model,
        cases: forModel.length,
        facts: average(forModel, 'facts'),
        tools: average(forModel, 'tools'),
        judge: average(forModel, 'judge'),
      }
    })
    console.table(summary)
    mkdirSync(RESULTS_DIR, { recursive: true })
    writeFileSync(
      join(RESULTS_DIR, `${suite}.json`),
      `${JSON.stringify({ summary, results }, null, 2)}\n`
    )
  })
}
