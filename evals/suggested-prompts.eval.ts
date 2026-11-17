import { SUGGESTED_QUESTIONS } from '../apps/frontend/src/chatHelpers.js'

import { defineEval, type EvalCase } from './lib/define-eval.js'

/** Which tool each suggested chip should end up calling. Keep in sync with the chips. */
const TOOLS: Record<string, string[]> = {
  "What's for lunch at the student restaurants today?": [
    'list_restaurants',
    'get_menu',
  ],
  "What's vegetarian at the student restaurants tomorrow?": [
    'list_restaurants',
    'get_menu',
  ],
  'Which library is least busy right now?': ['get_library_occupancy'],
  'What classes do I have tomorrow?': ['get_my_schedule'],
  'Where is my next class?': ['get_my_schedule'],
  'Which student restaurants are there, and where?': ['list_restaurants'],
}

const cases: EvalCase[] = [
  ...SUGGESTED_QUESTIONS.map((question): EvalCase => ({
    name: `chip: ${question}`,
    question,
    expected:
      'A short, friendly answer based on tool results. It answers the question (or says honestly that the data does not contain it, e.g. a closed restaurant or an empty schedule). It does not ask the student for ids or dates and does not report an error.',
    tools: TOOLS[question] ?? [],
  })),
]

defineEval('suggested-prompts', cases)
