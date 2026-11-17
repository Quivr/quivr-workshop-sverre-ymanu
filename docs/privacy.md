# Privacy: what leaves your laptop

The answer to the workshop's privacy discussion (`EXERCISES.md`), written from how the code works. Check it against a run in the **Traces** panel.

## What is sent to the LLM provider

Every chat turn sends Anthropic (via the Vercel AI SDK, `apps/agent/src/run-agent.ts`):

- the system prompt (including the current date and time),
- the whole conversation so far,
- the **full output of every tool the model called**. This is the part that carries personal data.

Tool output is whatever `apps/mcp/src/tools/*.ts` returns, so the tool decides what leaves. Today:

| Tool                                                    | Personal data in the output                                                                |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `get_my_schedule`                                       | **Yours:** class and event titles, times, rooms and teacher names for up to 14 days.       |
| `get_menu`, `list_restaurants`, `get_library_occupancy` | None (public data).                                                                        |
| Friend tools (`get_friends`, `find_common_free_slots`)  | **Friends':** names, and which times they are busy or free. Only what they share in Quivr. |

The Quivr login token and your email never go to the LLM. They stay in the MCP server (`QuivrClient`) and in `.env`.

`.traces/` on your disk keeps the same content for debugging. It is git-ignored; don't share it.

## Did your friends agree?

Not to this. A friend agreed to share their schedule with you inside Quivr. They did not agree to have it processed by a third-party AI provider. Before shipping to all users you would need:

- a clear consent or a Quivr setting ("allow my schedule to be used by the assistant"), off by default,
- a provider agreement that rules out training on the data, with a defined retention period, and a decision on where the data is processed (EU or not),
- a privacy notice that names the provider,
- a way to delete traces and logs.

## Sending less

The tools can already be stricter than the API. Ideas, cheapest first:

1. **Minimise at the tool**: return only the fields the answer needs. `find_common_free_slots` returns time slots and first names only, never friends' event titles or locations. Do the same for every tool that touches friends.
2. **Compute in code, not in the prompt**: the model gets "free 14:00–16:00", not the whole timetable.
3. **Pseudonymise**: send ids (`friend_1`) and map them back to names in the UI or in the tool when rendering the card.
4. **Sanitise output** (`apps/mcp/src/tools/sanitise.ts` on the injection branch) so a malicious value in the data can't carry instructions.
5. **Scope per request**: don't fetch 14 days of schedule to answer "where is my next class?".
6. **Keep sensitive writes human-confirmed**: `draft_invite` only builds a draft, and sending needs `QUIVR_READ_ONLY=false` plus an explicit confirmation.

## Not covered

Prompt injection through data (see `feat/injection-hardening`), model output that repeats personal data into logs, and the browser side (the chat is served from localhost; a hosted version would need authentication and transport security).
