# Merge playbook

Feature branches that start from the same `main` collide on the same registration points. Plan for it.

## Where branches conflict

| File                                       | Why                                         | Resolution                                                                 |
| ------------------------------------------ | ------------------------------------------- | -------------------------------------------------------------------------- |
| `apps/mcp/src/tools/index.ts`              | every tool adds an import and an array item | keep both sides, then dedupe                                               |
| `apps/frontend/src/cards/registry.ts`      | every card adds an import and a map entry   | keep both sides, then dedupe                                               |
| `apps/mcp/src/tools/tools.spec.ts`         | imports at top, tests appended at the end   | keep both; merge the `vitest` import into one line                         |
| `apps/mcp/src/quivr/quivr-client.ts`       | methods appended to the class               | keep both; check the closing `}` of the first method survived              |
| `apps/mcp/src/quivr/__generated__/graphql.ts` | generated                                | never merge by hand: take either side, then `workspace mcp codegen`        |
| `yarn.lock`, `package.json`                | dependencies, scripts (`test`)              | merge `package.json` by hand, then `yarn install` to regenerate the lock   |
| `evals/lib/*` (define-eval, run, scorers, start-mcp) | shared eval plumbing             | merge carefully by reading both; these are real logic, not lists           |
| `apps/agent/src/prompt.ts`, `define-tool.ts`, `config.ts` | shared behaviour            | read both changes and make sure they still work together                   |

Automatic "union" merges (keep both sides) are fine for plain lists but silently **drop the closing brace** between two appended methods, and duplicate lines when the merge base is virtual. Always run typecheck and eslint right after.

## Order

1. Merge small, independent branches first (UI cards, docs).
2. Then branches that touch shared plumbing (eval libs, define-tool, prompt) one by one.
3. Parents before stacked children. For a stacked branch whose parent was changed after the child was cut, apply the child's own diff onto `main`: `git diff <parent> <child> | git apply --3way --index`, then fix conflicts.

## After every merge

```bash
<yarn> workspace mcp codegen   # if any .graphql file changed
<yarn> install                 # if package.json changed
<yarn> typecheck && <yarn> test && <yarn> lint
```

Also check the **interaction** between merged features, not just each one: e.g. a sanitiser that caps every string at 500 chars broke a tool that returns long JSON strings. Fix such issues with a small commit that says why.

## Recording merges so PRs close

Use real merge commits (`git merge --no-ff feat/<slug>`) so the branch tip is reachable from `main` and GitHub marks the PR merged. If you had to apply a branch's diff by hand, finish with `git merge -s ours --no-ff feat/<slug>` to record it. A PR stacked on another branch will not show as merged when it lands on `main`: close it with a comment pointing to the commit.

## Safety

- Merge only what the user approved. Ask before pushing `main` if the user didn't say to.
- Never force-push `main`. Don't delete branches or worktrees without being asked.
- Don't touch branches you didn't create (teammates' branches) except to check for overlap.
