import { describe, expect, it } from 'vitest'

const sources = import.meta.glob('./**/*.tsx', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const UTILITY = 'bg|text|border|divide|ring|outline|from|via|to|fill|stroke'

/** Colours that only work on a light background. Use the theme tokens in index.css instead. */
const DENIED: [RegExp, string][] = [
  [
    /\b(?:bg|border|divide|ring|outline|from|via|to|fill|stroke)-(?:white|black)\b/,
    'use bg-surface / border-schedule-border-grey',
  ],
  [
    /\btext-black\b/,
    'use the inherited text colour, text-heading or text-muted',
  ],
  [
    new RegExp(`\\b(?:${UTILITY})-(?:gray|slate|zinc|neutral|stone)-\\d+`),
    'use bg-schedule-bg-grey, text-muted, border-schedule-border-grey',
  ],
  [
    new RegExp(`\\b(?:${UTILITY})-(?:red|green|blue)-\\d+`),
    'use text-danger-text / text-ok-text / text-link / bg-ok',
  ],
  [
    /\b(?:bg|text|border|fill|stroke)-\[(?:#|rgb|hsl)/,
    'arbitrary colour value',
  ],
  [/(?:color|background(?:Color)?)\s*:\s*['"`]?(?:#|rgb|hsl)/, 'inline colour'],
  [/#[0-9a-fA-F]{3,8}\b/, 'hex colour (put it in a token in index.css)'],
  [
    /\btext-(?:danger|vegan|vegetarian|green-status|blue-pretty|sidenav-blue|sidenav-secondary|main)(?![\w-])/,
    'fixed colour as text, not AA on both themes: use text-danger-text / text-ok-text / text-link / text-muted',
  ],
]

/** A line is allowed when it or one of the 3 lines before it has this marker plus a reason. */
const ALLOW = /dark-mode-ok:\s*\S/

describe('dark mode', () => {
  it('finds the frontend components', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(10)
  })

  it('has no light-only colour classes in components', () => {
    const problems: string[] = []
    for (const [file, source] of Object.entries(sources)) {
      const lines = source.split('\n')
      lines.forEach((line, index) => {
        if (
          lines
            .slice(Math.max(0, index - 3), index + 1)
            .some(l => ALLOW.test(l))
        )
          return
        for (const [pattern, hint] of DENIED) {
          const match = pattern.exec(line)
          if (match)
            problems.push(`${file}:${index + 1}: "${match[0]}" ${hint}`)
        }
      })
    }
    expect(
      problems,
      `Light-only colours found. Use a theme token, or allow with a "dark-mode-ok: reason" comment:\n${problems.join('\n')}`
    ).toEqual([])
  })

  it('flags a light-only colour in a sample', () => {
    const sample = '<div className="bg-white text-gray-600" />'
    expect(DENIED.some(([pattern]) => pattern.test(sample))).toBe(true)
  })
})
