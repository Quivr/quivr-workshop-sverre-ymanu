import { describe, expect, it } from 'vitest'

import {
  buildReport,
  estimateCost,
  lowJudgeCases,
  mergeResults,
  modelTable,
  summarise,
  type CaseRecord,
  type SuiteFile,
} from './report.js'

const HAIKU = 'anthropic:claude-haiku-5-5'
const SONNET = 'anthropic:claude-sonnet-5-5'

const record = (
  name: string,
  model: string,
  judge: number,
  extra: Partial<CaseRecord> = {}
): CaseRecord => ({
  case: name,
  model,
  answer: 'an answer',
  scores: [
    { name: 'facts', score: 1, reason: 'all facts present' },
    { name: 'tools', score: 1, reason: 'expected tools called' },
    { name: 'judge', score: judge, reason: `judge says ${judge}` },
  ],
  latencyMs: 2000,
  toolCallCount: 1,
  usage: { inputTokens: 1000, outputTokens: 100 },
  ...extra,
})

describe('mergeResults', () => {
  it('keeps other models and replaces the same model and case', () => {
    const stored = [
      record('a', HAIKU, 1),
      record('b', HAIKU, 1),
      record('a', SONNET, 0.5),
    ]
    const merged = mergeResults(stored, [record('a', HAIKU, 0.25)])
    expect(merged).toHaveLength(3)
    expect(merged.find(r => r.model === SONNET)?.scores[2]?.score).toBe(0.5)
    expect(
      merged.find(r => r.model === HAIKU && r.case === 'a')?.scores[2]?.score
    ).toBe(0.25)
    expect(merged.some(r => r.model === HAIKU && r.case === 'b')).toBe(true)
  })
})

describe('summarise', () => {
  it('averages scores and latency and sums tokens and cost', () => {
    const s = summarise(HAIKU, [
      record('a', HAIKU, 1, { latencyMs: 1000 }),
      record('b', HAIKU, 0.5, { latencyMs: 3000 }),
    ])
    expect(s).toMatchObject({
      cases: 2,
      facts: 1,
      judge: 0.75,
      avgLatencyMs: 2000,
      totalTokens: 2200,
    })
    // (2000 * 0.1 + 200 * 0.5) / 1e6
    expect(s.cost).toBeCloseTo(0.0003, 8)
  })

  it('leaves latency, tokens and cost undefined for old results', () => {
    const old = record('a', HAIKU, 1, {
      latencyMs: undefined,
      usage: undefined,
    })
    expect(summarise(HAIKU, [old])).toMatchObject({
      cases: 1,
      avgLatencyMs: undefined,
      totalTokens: undefined,
      cost: undefined,
    })
  })

  it('gives no cost for a model without a price', () => {
    expect(
      estimateCost('unknown:model', { inputTokens: 1, outputTokens: 1 })
    ).toBe(undefined)
  })
})

const suites: SuiteFile[] = [
  {
    suite: 'news',
    results: [
      record('latest', HAIKU, 1),
      record('latest', SONNET, 0.5, { latencyMs: 4000 }),
    ],
  },
  { suite: 'bars', results: [record('open', HAIKU, 0.75)] },
]

describe('modelTable', () => {
  it('has a row per suite, a total row and dashes for missing suites', () => {
    const table = modelTable(SONNET, suites)
    expect(table).toContain(`### ${SONNET}`)
    expect(table).toContain(
      '| news | 1 | 1.00 | 1.00 | 0.50 | 4.0 s | 1,100 | ~$0.00300 |'
    )
    expect(table).toContain('| bars | - | - | - | - | - | - | - |')
    expect(table).toContain('| **all suites** | 1 |')
  })
})

describe('lowJudgeCases', () => {
  it('lists every case below 1 with the judge reason, and escapes pipes', () => {
    const out = lowJudgeCases([
      {
        suite: 'news',
        results: [
          record('x', HAIKU, 0.5, {
            scores: [{ name: 'judge', score: 0.5, reason: 'too long | wrong' }],
          }),
          record('y', HAIKU, 1),
        ],
      },
    ])
    expect(out).toBe(
      '- **news / x** (' + HAIKU + '): judge 0.50. too long \\| wrong'
    )
  })

  it('says so when there are none', () => {
    expect(
      lowJudgeCases([{ suite: 's', results: [record('a', HAIKU, 1)] }])
    ).toMatch(/^None/)
  })
})

describe('buildReport', () => {
  it('has one table per model and the low-judge list, suites sorted', () => {
    const report = buildReport(suites)
    expect(report).toContain('# Eval report')
    expect(report).toContain(`### ${HAIKU}`)
    expect(report).toContain(`### ${SONNET}`)
    expect(report).toContain('## Cases with a judge score below 1')
    expect(report).toContain('**news / latest** (' + SONNET + ')')
    expect(report.indexOf('| bars |')).toBeLessThan(report.indexOf('| news |'))
  })

  it('handles no results', () => {
    expect(buildReport([])).toContain('No results found.')
  })
})
