# Eval report

`just eval-report` (or `yarn workspace evals report`) turns the results of the eval runs into `evals/results/REPORT.md` and prints it. It automates the table in [model-comparison.md](model-comparison.md).

```bash
EVAL_MODELS=anthropic:claude-haiku-5-5 yarn eval
EVAL_MODELS=anthropic:claude-sonnet-5-5 yarn eval
just eval-report
```

## What is recorded

Each eval case stores in `evals/results/<suite>.json`: the scores, and for the agent run its latency in ms (the judge call is not included), the number of tool calls and the total token usage (input and output, from the AI SDK `finish` part).

Results are **merged by model and case**: running one model, or one case, replaces only those entries and keeps the other models' results for the same suite. (Before, the file was overwritten per suite.) A case you delete or rename in a suite stays in the file until you delete the JSON file. Files written before this change have no latency or tokens; the report shows `n/a`.

## What the report contains

- One table per model: suites as rows, with cases, facts, tools, judge average, average latency, total tokens and estimated cost.
- A list of every case whose judge score is below 1, with the judge's reason. Read this first: it shows what to fix in the prompt or the tools.

Cost is an estimate from list prices (`evals/lib/report.ts`, a copy of `apps/frontend/src/traces/cost.ts`: keep them in sync). A model without a price shows `n/a`.

Different suites may have been run at different times, so one run per case is noise, not a benchmark.

`yarn workspace evals report <dir>` (or `EVAL_RESULTS_DIR=<dir>`) reads another results directory. The aggregation lives in `evals/lib/report.ts`, tested by `evals/lib/report.spec.ts` (run by `yarn test`, no servers or API key).
