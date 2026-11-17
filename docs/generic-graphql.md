# Generic GraphQL tool vs purpose-built tools

`run_graphql_query(query, variables?)` lets the model write its own GraphQL against Quivr instead of calling a tool built for one question. It is **off by default**. This page explains how to switch it on and how to compare it with the purpose-built tools using the evals.

## Switch it on

Set in `.env`, then restart the MCP server (`just dev` restarts on save):

```
ENABLE_GENERIC_GRAPHQL=true
```

The tool is then listed next to the others, and the agent picks it up on the next message. Its description tells the model to prefer the purpose-built tools when one fits.

## What keeps it safe

- It goes through `QuivrClient.rawQuery`, the same single door to Quivr as every other tool (`apps/mcp/src/quivr/quivr-client.ts`).
- The query is parsed with the `graphql` package (`apps/mcp/src/quivr/raw-query.ts`) and must be **exactly one `query` operation**. Mutations and subscriptions are rejected, **even with `QUIVR_READ_ONLY=false`**. Fragment definitions, multiple operations, queries over 4000 characters and queries nested deeper than 8 levels are rejected too, with a message the model can act on.
- Responses over 20000 characters are cut and returned as `{ truncated: true, totalChars, note, partialJson }`, so the model knows the data is incomplete.
- In `QUIVR_MODE=fixtures` only recorded data exists. A raw query is accepted only when it matches one of the files in `apps/mcp/src/quivr/queries/` (formatting does not matter), and its variables must match a recorded fixture. Any other query fails with an error that says raw queries need `QUIVR_MODE=live` and lists the recorded queries. This is by design: use live mode to explore freely.
- The backend still applies the logged-in user's own permissions.

## Compare with the purpose-built tools

`evals/generic-graphql.eval.ts` asks four of the questions from `starter.eval.ts` (next class, vegetarian meals, list restaurants, unknown exam) but only exposes `run_graphql_query` to the agent (`onlyTools` in `defineEval`). It is skipped unless the flag is set, so a plain `yarn eval` is unchanged.

```bash
yarn eval starter                                    # purpose-built tools
ENABLE_GENERIC_GRAPHQL=true yarn eval generic-graphql  # only run_graphql_query
```

Each run writes `evals/results/<suite>.json` with per-case answers and scores (facts, tools, judge) and prints a summary table per model. Compare:

- **Scores:** does the generic tool get the same facts right? Where does it fail: wrong field names, wrong date range, giving up?
- **Steps and tokens:** open the Traces panel for the same question on both. Expect more tool calls (retries after a backend or fixtures error) and much larger tool results for the generic tool, because it returns whatever the query selected.
- **Fixtures vs live:** the evals run on fixtures, where the model can only send recorded queries unchanged. That makes the generic tool look worse than it would live. Re-run manually with `QUIVR_MODE=live` and questions the purpose-built tools cannot answer (friends, news, student bars) to see where it helps.
- **Model:** run with `EVAL_MODELS=anthropic:claude-haiku-5-5` and again with the stronger model. The generic tool usually depends much more on model quality.

Both suites can also run in one go with `ENABLE_GENERIC_GRAPHQL=true yarn eval`. In that case the starter suite also sees the generic tool, so it is no longer a pure baseline.
