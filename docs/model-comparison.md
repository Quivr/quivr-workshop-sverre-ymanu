# Model comparison: Haiku 5.5 vs Sonnet 5.5

Eval suites run on fixtures, once per model (`EVAL_MODELS=<model> yarn eval <suite>`). One run each, so small differences are noise. "Facts" and "tools" are deterministic checks (a case fails if they are below 1); "judge" is the LLM judge score (0 to 1, average per suite, judged by Haiku). Latency is the average time of the agent run per case, as logged by the evals.

| Suite (branch)                               | Cases | Haiku judge | Sonnet judge | Haiku latency | Sonnet latency |
| -------------------------------------------- | ----- | ----------- | ------------ | ------------- | -------------- |
| library (`feat/library-card`)                | 4     | 0.98        | 1.00         | 2.3 s         | 3.5 s          |
| find-dish (`feat/find-dish`)                 | 5     | 0.90        | 0.80         | 2.9 s         | 4.4 s          |
| friends-free (`feat/friends-free-slots`)     | 5     | 1.00        | 1.00         | 2.4 s         | 3.6 s          |
| news (`feat/news-tool`)                      | 5     | 1.00        | 0.80         | 2.2 s         | 3.1 s          |
| bars (`feat/student-bars`)                   | 5     | 1.00        | 1.00         | 2.3 s         | 2.7 s          |
| injection (`feat/injection-hardening`)       | 4     | 0.88        | 0.75         | 2.8 s         | 4.3 s          |
| suggested-prompts (`feat/suggested-prompts`) | 6     | 0.75        | 0.75         | 5.7 s         | 6.3 s          |

Facts and tools were 1.00 for both models in every suite. (The first Haiku news run failed on the eval's own checks, which were then fixed; the Haiku figure above is from the fixed run.)

## What to take from it

- **Both models call the right tools and state the right facts.** The deterministic checks don't separate them on this data.
- **Sonnet is slower (about 1.1 to 1.5 times), and its judge scores were not higher.** Where it scored lower, the judge was marking down longer or more elaborate answers (find-dish, news, injection) rather than wrong ones. With one run per case that is within noise.
- **Both models give long answers to the broad menu questions** ("What's for lunch today?"): the suggested-prompts suite scores 0.75 for both. That is a prompt problem ("keep answers short"), not a model one.
- Cost is not measured here. Use the Traces panel on `feat/better-traces` (token usage and estimated cost per run) to compare tokens for a given question. Sonnet's list price is about 20 times Haiku's.

## Reproduce

```bash
EVAL_MODELS=anthropic:claude-haiku-5-5 yarn eval
EVAL_MODELS=anthropic:claude-sonnet-5-5 yarn eval
EVAL_MODELS=anthropic:claude-haiku-5-5,anthropic:claude-sonnet-5-5 yarn eval   # both, with a summary table
```
