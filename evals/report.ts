/**
 * Reads evals/results/*.json and writes evals/results/REPORT.md.
 * Usage: tsx report.ts [resultsDir]   (default: ./results, or EVAL_RESULTS_DIR)
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { buildReport, type SuiteFile } from './lib/report.js'

const dir = resolve(
  process.argv[2] ??
    process.env.EVAL_RESULTS_DIR ??
    join(import.meta.dirname, 'results')
)

let files: string[] = []
try {
  files = readdirSync(dir).filter(file => file.endsWith('.json'))
} catch {
  console.error(`No results directory at ${dir}. Run \`yarn eval\` first.`)
  process.exit(1)
}

const suites: SuiteFile[] = files.map(file => {
  const data = JSON.parse(readFileSync(join(dir, file), 'utf8')) as {
    results?: SuiteFile['results']
  }
  return { suite: file.replace(/\.json$/, ''), results: data.results ?? [] }
})

const report = buildReport(suites)
writeFileSync(join(dir, 'REPORT.md'), report)
console.info(report)
console.info(`Written to ${join(dir, 'REPORT.md')}`)
