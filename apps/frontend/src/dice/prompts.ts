/** One question per roll: DICE_PROMPTS[roll - 1]. All read-only, answerable from the existing tools. */
export const DICE_PROMPTS: readonly string[] = [
  'Critical fail! Which library is the quietest right now, so I can hide in shame?',
  "What's the cheapest main dish at the student restaurants today?",
  'Where can I get pizza at the student restaurants this week?',
  'Which student bars are open right now, and how busy are they?',
  'Any student deals on coffee or snacks right now?',
  "What's the latest news on campus?",
  'Where is my next class, and when does it start?',
  'Is there anything vegan on the menu at the student restaurants today?',
  "What's happening on campus this week?",
  'How packed is my day tomorrow? Be honest.',
  'When are all my friends and I free at the same time tomorrow?',
  'Any concerts or parties coming up, and what do the tickets cost?',
  "Is there lasagna anywhere this week? I'm feeling lucky.",
  'Give me a quick overview of my day today, plus a lunch spot near my next class.',
  'Rank the libraries from emptiest to fullest right now.',
  'Which partner discounts can a broke student use right now?',
  'Any news about housing or student life?',
  'Where can I find a vegan burger this week?',
  'Which student bar is the quietest right now? Asking for a chill drink.',
  "JACKPOT! What's my day like today, where can I eat near my next class, and what's happening on campus tonight?",
]

export const promptForRoll = (roll: number): string => {
  const prompt = DICE_PROMPTS[roll - 1]
  if (!prompt) throw new RangeError(`Not a D20 roll: ${roll}`)
  return prompt
}

/** What the student "types": the die, the number and the question. */
export const formatRollMessage = (roll: number): string =>
  `🎲 ${roll}: ${promptForRoll(roll)}`
