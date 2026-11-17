/**
 * Pure aggregation and formatting for the eval report. No servers, no LLM:
 * unit-tested in report.spec.ts, used by define-eval.ts and report.ts.
 */

export type ScoreRecord = { name: string; score: number; reason: string }

export type CaseRecord = {
  case: string
  model: string
  answer: string
  scores: ScoreRecord[]
  /** Duration of the agent run in ms (not the judge). */
  latencyMs?: number
  toolCallCount?: number
  usage?: { inputTokens?: number; outputTokens?: number }
}

export type SuiteFile = { suite: string; results: CaseRecord[] }

/**
 * ESTIMATED list prices in USD per million tokens. KEEP IN SYNC with
 * apps/frontend/src/traces/cost.ts (evals must not depend on the frontend).
 * A model that is not listed gets no cost.
 */
const PRICES_PER_MILLION_TOKENS: Record<
  string,
  { input: number; output: number }
> = {
  'anthropic:claude-haiku-5-5': { input: 0.1, output: 0.5 },
  'anthropic:claude-sonnet-5-5': { input: 2, output: 10 },
}

export const estimateCost = (
  model: string,
  usage: { inputTokens: number; outputTokens: number }
): number | undefined => {
  const price = PRICES_PER_MILLION_TOKENS[model]
  if (!price) return undefined
  return (
    (usage.inputTokens * price.input + usage.outputTokens * price.output) /
    1_000_000
  )
}

/**
 * Merges new case results into the stored ones. A case is replaced when the
 * same case ran again on the same model, so running one model (or one case)
 * never erases results of other models for the same suite.
 */
export const mergeResults = (
  stored: CaseRecord[],
  fresh: CaseRecord[]
): CaseRecord[] => {
  const replaced = new Set(fresh.map(r => `${r.model}\u0000${r.case}`))
  return [
    ...stored.filter(r => !replaced.has(`${r.model}\u0000${r.case}`)),
    ...fresh,
  ]
}

const scoresOf = (results: CaseRecord[], name: string) =>
  results.flatMap(r => r.scores.filter(s => s.name === name).map(s => s.score))

const mean = (values: number[]) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : undefined

export type ModelSummary = {
  model: string
  cases: number
  facts?: number
  tools?: number
  judge?: number
  avgLatencyMs?: number
  totalTokens?: number
  cost?: number
}

export const summarise = (
  model: string,
  results: CaseRecord[]
): ModelSummary => {
  const withUsage = results.filter(r => r.usage)
  const inputTokens = withUsage.reduce(
    (sum, r) => sum + (r.usage?.inputTokens ?? 0),
    0
  )
  const outputTokens = withUsage.reduce(
    (sum, r) => sum + (r.usage?.outputTokens ?? 0),
    0
  )
  return {
    model,
    cases: results.length,
    facts: mean(scoresOf(results, 'facts')),
    tools: mean(scoresOf(results, 'tools')),
    judge: mean(scoresOf(results, 'judge')),
    avgLatencyMs: mean(
      results.flatMap(r => (r.latencyMs === undefined ? [] : [r.latencyMs]))
    ),
    totalTokens: withUsage.length ? inputTokens + outputTokens : undefined,
    cost: withUsage.length
      ? estimateCost(model, { inputTokens, outputTokens })
      : undefined,
  }
}

export const modelsIn = (suites: SuiteFile[]): string[] =>
  [...new Set(suites.flatMap(s => s.results.map(r => r.model)))].sort()

const num = (value: number | undefined) =>
  value === undefined ? 'n/a' : value.toFixed(2)

const seconds = (ms: number | undefined) =>
  ms === undefined ? 'n/a' : `${(ms / 1000).toFixed(1)} s`

const tokens = (value: number | undefined) =>
  value === undefined ? 'n/a' : value.toLocaleString('en-US')

const money = (value: number | undefined) =>
  value === undefined
    ? 'n/a'
    : `~$${value < 0.01 ? value.toFixed(5) : value.toFixed(3)}`

const cell = (text: string) => text.replace(/\s+/g, ' ').replace(/\|/g, '\\|')

const COLUMNS = [
  'Cases',
  'Facts',
  'Tools',
  'Judge',
  'Latency',
  'Tokens',
  'Cost',
] as const

const row = (label: string, s: ModelSummary | undefined) =>
  s
    ? `| ${label} | ${s.cases} | ${num(s.facts)} | ${num(s.tools)} | ${num(s.judge)} | ${seconds(s.avgLatencyMs)} | ${tokens(s.totalTokens)} | ${money(s.cost)} |`
    : `| ${label} | ${COLUMNS.map(() => '-').join(' | ')} |`

/** One table per model (suites as rows, plus a total row). */
export const modelTable = (model: string, suites: SuiteFile[]): string => {
  const forModel = (suite: SuiteFile) =>
    suite.results.filter(r => r.model === model)
  const summaryOf = (results: CaseRecord[]) =>
    results.length ? summarise(model, results) : undefined
  return [
    `### ${model}`,
    '',
    `| Suite | ${COLUMNS.join(' | ')} |`,
    `| --- | ${COLUMNS.map(() => '---').join(' | ')} |`,
    ...suites.map(suite => row(suite.suite, summaryOf(forModel(suite)))),
    row('**all suites**', summaryOf(suites.flatMap(forModel))),
  ].join('\n')
}

/** Every case whose judge score is below 1, with the judge's reason. */
export const lowJudgeCases = (suites: SuiteFile[]): string => {
  const lines = suites.flatMap(suite =>
    suite.results.flatMap(r =>
      r.scores
        .filter(s => s.name === 'judge' && s.score < 1)
        .map(
          s =>
            `- **${suite.suite} / ${r.case}** (${r.model}): judge ${s.score.toFixed(2)}. ${cell(s.reason)}`
        )
    )
  )
  return lines.length ? lines.join('\n') : 'None: every judge score is 1.'
}

export const buildReport = (suites: SuiteFile[]): string => {
  const sorted = [...suites].sort((a, b) => a.suite.localeCompare(b.suite))
  const models = modelsIn(sorted)
  return [
    '# Eval report',
    '',
    'Generated by `just eval-report` from `evals/results/*.json`. Facts, tools and judge are averages per case (0 to 1). Latency is the average agent run per case (judge not included). Tokens and cost are totals; cost is an estimate from list prices. "n/a" means the run did not record it, "-" means the suite has no results for that model.',
    '',
    ...(models.length
      ? models.flatMap(model => [modelTable(model, sorted), ''])
      : ['No results found.', '']),
    '## Cases with a judge score below 1',
    '',
    lowJudgeCases(sorted),
    '',
  ].join('\n')
}
