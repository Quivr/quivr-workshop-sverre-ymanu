---
name: Parallel Features
description: Orchestrate several coding agents that each implement one Ask Quivr feature on its own branch in parallel, then verify, open PRs and merge on approval. Use when asked to add multiple features, run a "fleet" of agents, or act as an orchestrator for this repo.
---

# Parallel features (orchestrator)

You are the **orchestrator**. You plan, delegate, verify and report. You do **not** implement features yourself: every code change is done by a subagent working in its own git worktree. You may edit only orchestration artefacts (briefs, PR bodies, docs about the process) and resolve merge conflicts when merging approved branches.

Read `AGENTS.md` first: it defines the architecture, "Add a tool end to end", the rules and the checks every feature must pass.

## 1. Plan

1. Read `AGENTS.md`, `EXERCISES.md`, `docs/quivr-api-notes.md`, and `git log`/`git branch -a` so you don't duplicate work that exists locally, on the remote or in open PRs (`gh pr list`).
2. Choose features that are **small, independent and read-only by default** (one tool + card + tests + evals, or one UI improvement). Prefer features whose data exists in `apps/mcp/src/quivr/schema.json`.
3. For each feature write down: branch name `feat/<slug>`, the user-visible behaviour, files it will touch, and which shared files it will conflict on (see `references/merge-playbook.md`).
4. If the user asked for features without naming them, make them up yourself, state them in one table, and let the user approve or deny the resulting branches/PRs. Ask first only when a feature would write to Quivr, cost money or send data to a new third party.

## 2. Prepare isolation

One worktree per agent, all from the same base (normally `main`), outside the repo:

```bash
git worktree add -b feat/<slug> /tmp/opencode/worktrees/<slug> main
cd /tmp/opencode/worktrees/<slug> && <yarn> install --immutable
```

- Check which Yarn works: `package.json` pins Yarn 4 via Corepack. If `corepack` is missing, install it into a prefix (`npm i --prefix /tmp/opencode/corepack corepack`) and use `/tmp/opencode/corepack/node_modules/.bin/yarn` with `COREPACK_ENABLE_DOWNLOAD_PROMPT=0`. Put the exact command in every brief.
- A feature that builds on another (e.g. `send_invite` on `draft_invite`) is **stacked**: branch it from the other branch and open its PR against that branch.
- Never share a worktree between agents.

## 3. Brief the agents

Use `references/agent-brief.md` as the template. Every brief must be self-contained (agents start with no context) and contain: worktree path and branch, how to run Yarn, "read AGENTS.md first", the feature, acceptance checks, the constraints below, and the format of the final reply.

Constraints to copy into every brief:

- Work only inside your worktree; never touch the main checkout or other worktrees.
- Do **not** run `yarn eval` or anything that starts the eval MCP server (fixed port, parallel runs collide). Only typecheck the evals (`<yarn> workspace evals typecheck`). The orchestrator runs evals.
- No real personal data. Never run `just login`, `just record-fixtures` or a real mutation. Hand-written fixtures must be clearly fake.
- Respect `QUIVR_READ_ONLY`; tools that write must say in their description that the model shows a draft and gets confirmation first.
- Don't edit generated files by hand (`<yarn> workspace mcp codegen`).
- Finish with typecheck, test, lint passing, prettier on changed files, one clean commit. **Do not push or merge.**
- Final reply is short: what was built, files changed, what was verified, caveats, expected merge-conflict hotspots.

Launch all agents **in one go** (parallel `subagent` calls with `agent: "general"`), then end your turn or work on non-overlapping orchestration; do not poll.

## 4. Verify (sequentially, you drive, agents implement)

When an agent reports back:

1. Skim its summary for unverified claims and caveats.
2. Run its evals **one branch at a time** (shared port 3102): copy `.env` into the worktree (it is git-ignored; never print it or paste tokens into chat), then `EVAL_MODELS=anthropic:claude-haiku-5-5 <yarn> workspace evals eval <file>`. Use `run_in_background` for the batch.
3. If an eval fails, decide whether the **tool/prompt** or the **eval** is wrong (compare the logged answer with the data). Send the fix back to the same subagent (`sessionID`) rather than fixing it yourself; for trivial eval-wording fixes you may delegate them in one short follow-up.
4. Never mark a feature "done" because it typechecks: LLM behaviour is only verified by the evals.

## 5. Publish and review

- `git push -u origin feat/<slug>` per branch, then `gh pr create --base main` (or the parent branch for stacked ones) with a short body: what it adds, notable design choices, caveats (not run in a browser, fake fixtures, API limits), checks run.
- Give the user one table: PR, branch, one-line summary, eval result, caveats. They approve or deny.

## 6. Merge on approval

Follow `references/merge-playbook.md`. Merge approved branches one at a time into `main`, re-running typecheck/test/lint after each, regenerate generated files and the lockfile instead of merging them, push, and let GitHub close the PRs. Close denied PRs with a comment and delete their branches only if the user says so. Afterwards offer to remove worktrees (`git worktree remove`).

## Reporting style

Keep messages short: a table of branches/PRs, what was verified, what was not (browser, real backend, other models), and what you need from the user.
