# Ask Quivr

Starter repo for the DataCamp × Quivr workshop **"Shipping AI Features You Can Trust"**.

A chat assistant on top of the real Quivr backend: ask about your schedule, student restaurant menus and library occupancy. During the workshop you add new AI features with a coding agent, then write evals to check they work. See [EXERCISES.md](EXERCISES.md).

## Quick start

You need what you already have for Quivr development: Git, Node via fnm or nvm, corepack and [`just`](https://github.com/casey/just#installation). On Windows, work inside WSL Ubuntu, as for the Quivr backend.

```bash
just setup    # 1. Node 24 from .nvmrc, Yarn, dependencies, creates .env
              # 2. Put your group's ANTHROPIC_API_KEY in .env
just login    # 3. Log in to Quivr (see below)
just dev      # 4. Start everything, then open http://localhost:5173
just doctor   # 5. In a second terminal: everything should be green
```

Then ask: _"What's on the menu at Alma 2 today and where is my next class?"_

No Quivr account, or no internet? Set `QUIVR_MODE=fixtures` in `.env` and skip `just login`. The app then uses recorded, anonymised data, and "now" is frozen at the moment the data was recorded.

Use your coding agent with `just opencode`. It loads `.env` and uses the same models as the app. `AGENTS.md` tells the agent how the repo works.

### Per platform

- **macOS:** install `just` with `brew install just` and fnm with `brew install fnm`.
- **Linux:** install `just` with your package manager (or `cargo install just`) and fnm with `curl -fsSL https://fnm.vercel.app/install | bash`.
- **Windows:** open your WSL Ubuntu terminal and follow the Linux steps. Clone inside the WSL file system (for example `~/workspace`), not under `/mnt/c`, so file watching is fast.

Without `just`, every recipe is a `yarn` script: `corepack enable && yarn install`, `yarn workspace mcp login`, `yarn dev`, `yarn doctor`.

## Logging in to Quivr

The workshop uses Quivr's beta backend (`https://rails-beta.quivr.be`). Create a test account at <https://alpha.quivr.be>, then send the user ID from your settings to the Quivr team so they make you a Quivr member (needed for the full API).

`just login` asks for your Quivr email and password (and your one-time code if you use 2FA). It calls `POST {QUIVR_BASE_URL}/api/login`, the same login the Quivr app uses, and writes the token to `.env`:

```
QUIVR_AUTHORIZATION=Bearer …
QUIVR_UID=you@example.com
QUIVR_CLIENT=…
QUIVR_ACCESS_TOKEN=…
```

Your password is only sent to Quivr and never stored. The token doesn't change between requests and stays valid until you log out, so the MCP server reads it from `.env` on each request (no restart needed).

**At the end of the workshop, run `just logout`.** It revokes the token on the Quivr backend and clears it from `.env`.

## Architecture

```
browser (frontend) --AG-UI over HTTP/SSE--> agent --MCP (streamable HTTP)--> mcp --GraphQL--> Quivr backend
                                              |
                                              +--> Anthropic API (LLM)
```

| App             | Port | What it does                                                                                                |
| --------------- | ---- | ----------------------------------------------------------------------------------------------------------- |
| `apps/frontend` | 5173 | React + Vite + Tailwind chat in the Quivr style. Talks AG-UI with `@ag-ui/client`. Renders a card per tool. |
| `apps/agent`    | 3001 | NestJS. `POST /agent` (AG-UI), `GET /models`, `GET /traces`. Runs the LLM loop with the Vercel AI SDK.      |
| `apps/mcp`      | 3002 | NestJS MCP server at `/mcp`. Wraps the Quivr GraphQL API in tools.                                          |
| `evals/`        | —    | Eval suite: runs the real agent on recorded fixtures and scores the answers.                                |

Tools are listed over MCP, so a new tool in `apps/mcp` shows up in the agent without touching `apps/agent`. `AGENTS.md` walks through adding one.

### Settings (`.env`)

| Variable                              | Meaning                                                                                         |
| ------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `ANTHROPIC_API_KEY`                   | Your group's key.                                                                               |
| `OPENAI_API_KEY`                      | Optional. Needed only if you add an `openai:<model>` id to `ALLOWED_MODELS`.                    |
| `ALLOWED_MODELS`, `DEFAULT_MODEL`     | Models the chat may use (`provider:model`). The dropdown shows them.                            |
| `JUDGE_MODEL`                         | Model for the LLM-as-judge scorer.                                                              |
| `QUIVR_MODE`                          | `live` (real backend) or `fixtures` (recorded data).                                            |
| `QUIVR_READ_ONLY`                     | `true` blocks every GraphQL mutation in `QuivrClient`. Set `false` only to really send invites. |
| `QUIVR_BASE_URL`                      | Quivr backend, beta by default.                                                                 |
| `QUIVR_AUTHORIZATION`, `QUIVR_UID`, … | Written by `just login`.                                                                        |

To compare with OpenAI, set `OPENAI_API_KEY` and add e.g. `openai:<model>` to `ALLOWED_MODELS` (and optionally `JUDGE_MODEL`, or `EVAL_MODELS` for the evals). Without the key, picking an `openai:` model fails with a clear error, and `just doctor` flags it. Other providers go in `apps/agent/src/models.ts`.

## Commands

| `just …`                             | Does                                                                      |
| ------------------------------------ | ------------------------------------------------------------------------- |
| `setup`, `login`, `logout`, `doctor` | Setup and checks                                                          |
| `dev`                                | mcp + agent + frontend in watch mode                                      |
| `opencode`                           | Your coding agent with the workshop key and models                        |
| `inspector`                          | MCP Inspector against the running MCP server (try a tool without the LLM) |
| `typecheck`, `lint`, `test`          | Code checks                                                               |
| `eval`, `eval-ui`, `eval-report`     | Run the evals (`eval-ui`: Vitest UI), write `evals/results/REPORT.md`     |
| `record-fixtures`                    | Record and anonymise fixtures from the live backend                       |
| `gql-gen`                            | Generate types for `apps/mcp/src/quivr/queries/*.graphql`                 |

## Observability

Everything stays on your laptop:

- The agent logs one line per tool call: `[tool] get_menu {"restaurantId":"3",…} → 2140 chars (212 ms)`.
- Every run is appended to `.traces/<date>.jsonl`: messages, tool calls with arguments, results and durations, the answer, tokens and errors.
- The **Traces** button in the chat shows the recent runs.

## Evals

`yarn eval` starts its own MCP server on fixtures (port 3102), asks the agent each question with the clock frozen at the recording time, and scores the answer three ways:

- **facts**: required strings or patterns appear in the answer (deterministic)
- **tools**: the expected tools were called (deterministic)
- **judge**: an LLM compares the answer with the expected answer (`JUDGE_MODEL`)

A case fails when a deterministic score is below 1. The judge score is reported, not enforced. Results per model (scores, latency, tool calls, tokens) are written to `evals/results/`, merged by model. `just eval-report` turns them into a Markdown report, see [docs/eval-report.md](docs/eval-report.md). Expected facts are computed from the fixtures, so the cases stay valid when fixtures are re-recorded.

**Baseline** (fixtures recorded on beta on 2026-11-16, 8 cases per model):

| Model                         | facts | tools | judge |
| ----------------------------- | ----- | ----- | ----- |
| `anthropic:claude-haiku-5-5`  | 1.00  | 1.00  | 1.00  |
| `anthropic:claude-sonnet-5-5` | 1.00  | 1.00  | 0.94  |

LLM answers vary, so expect a case or so to flip between runs. Example of a fix found this way: Quivr flags some dishes as vegan but not vegetarian, and Haiku then left them out. `get_menu` now marks vegan dishes as vegetarian too.

We use a small Vitest-based runner instead of Evalite: Evalite 0.19 pins Vitest 4 internals and an older AI SDK provider package, and needs a native SQLite module that compiles from source on Node 24.

## Troubleshooting

| Symptom                                               | Fix                                                                                                    |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `just doctor`: Node version                           | `just setup` (or `fnm use`)                                                                            |
| `Not logged in to Quivr` / `rejected the login token` | `just login`                                                                                           |
| `x-api-key header is required`                        | Put `ANTHROPIC_API_KEY` in `.env`, restart `just dev`                                                  |
| `Model "…" is not allowed`                            | Use one of `ALLOWED_MODELS`                                                                            |
| `No recorded data for …` in fixtures mode             | Only dates around the recording day exist. Ask about "today" or re-record with `just record-fixtures`. |
| Port 3001/3002/5173 in use                            | Stop the other `just dev`, or set `AGENT_PORT` / `MCP_PORT`                                            |
| New tool doesn't show up                              | Is it in `apps/mcp/src/tools/index.ts`? Check the `[mcp]` log line listing the tools.                  |
| Edits not picked up on Windows                        | Clone inside the WSL file system, not under `/mnt/c`.                                                  |

## Rules

Read-only by default, no real student data in fixtures, no secrets in code. A pre-commit hook (`yarn check-secrets`) blocks commits that look like they contain keys or tokens.
