# Agent brief template

Copy, fill in the `<…>` parts, and pass as the subagent `prompt` (`agent: "general"`, short `description` like "Feature: <name>"). Agents start with no context, so keep it self-contained.

````
You are implementing ONE feature for the "Ask Quivr" student chatbot repo. Work ONLY inside the git worktree <WORKTREE_PATH> (branch `feat/<slug>`, based on <BASE>, already `yarn install`ed). Do not touch /home/sverre/projects/quivr-workshop or any other worktree.

Setup: <HOW TO RUN YARN, e.g. `export COREPACK_ENABLE_DOWNLOAD_PROMPT=0; Y=/tmp/opencode/corepack/node_modules/.bin/yarn`>. Run `$Y typecheck`, `$Y test`, `$Y lint` from the worktree root. Read AGENTS.md first and follow its rules and, for a tool, "Add a tool end to end" (read-only, keep it small, prettier: no semicolons, single quotes, .js import extensions in apps/mcp and apps/agent). <EXTRA FILES TO READ>

FEATURE: <one paragraph: user-visible behaviour, example questions, tool name and signature, what the output contains, what it must NOT contain (privacy), card yes/no>.

Details: <data source: GraphQL operation + schema.json fields, helper to reuse, where pure logic goes and that it needs unit tests>.

Tests and evals: a tools.spec.ts case with a fake QuivrClient (include an empty/no-match case), and 3-5 cases in evals/<name>.eval.ts (copy evals/starter.eval.ts; expected facts computed from fixtures via evals/lib/fixture-data.ts; include one case where the answer is NOT in the data and the agent must say it doesn't know).

Constraints:
- No real personal data. Do not run `just login`, `just record-fixtures` or any real mutation. Hand-written fixtures must be clearly fake.
- Do NOT run `yarn eval` or anything that starts the eval MCP server (port clash with parallel agents). Only check that evals typecheck: `$Y workspace evals typecheck`.
- Don't hand-edit generated files; use `$Y workspace mcp codegen`.
- <FEATURE-SPECIFIC RULES, e.g. write tools must say a draft + confirmation are required>

Finish: typecheck, test and lint pass; run prettier on changed files; `git add -A && git commit` on your branch with a clear message. Do NOT push or merge. Final reply (short): what you built, files changed, what you verified, what you could not verify, caveats, and expected merge-conflict hotspots.
````

## Notes for the orchestrator

- Frontend-only features: replace "Tests and evals" with "vitest tests for pure helpers; typecheck, lint and `workspace frontend build` must pass; you cannot test in a browser, say so".
- Stacked features: base the worktree on the parent branch and say so in the brief.
- Two phases for one agent (e.g. draft then send): ask for two commits so two PRs can be cut.
- Follow-ups go to the same agent with its `sessionID`, not a new agent.
