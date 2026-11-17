import { describe, expect, it } from 'vitest'

import {
  THEME_CYCLE,
  nextTheme,
  parseTheme,
  resolveTheme,
  themeClasses,
  type Theme,
} from './theme'

describe('parseTheme', () => {
  it('accepts the three themes, including the legacy light/dark values', () => {
    expect(parseTheme('light')).toBe('light')
    expect(parseTheme('dark')).toBe('dark')
    expect(parseTheme('drunk')).toBe('drunk')
  })

  it('ignores missing and unknown values', () => {
    for (const value of [null, '', 'Dark', 'sepia', 'undefined', '{"a":1}'])
      expect(parseTheme(value)).toBeNull()
  })
})

describe('resolveTheme', () => {
  it('prefers a saved value over the OS setting', () => {
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
    expect(resolveTheme('drunk', false)).toBe('drunk')
  })

  it('falls back to the OS setting for missing or unknown values', () => {
    expect(resolveTheme(null, true)).toBe('dark')
    expect(resolveTheme(null, false)).toBe('light')
    expect(resolveTheme('sepia', true)).toBe('dark')
    expect(resolveTheme('sepia', false)).toBe('light')
  })
})

describe('nextTheme', () => {
  it('cycles light -> dark -> drunk -> light', () => {
    expect(nextTheme('light')).toBe('dark')
    expect(nextTheme('dark')).toBe('drunk')
    expect(nextTheme('drunk')).toBe('light')
  })

  it('visits every theme before repeating', () => {
    let theme: Theme = 'light'
    const seen = THEME_CYCLE.map(() => {
      const current = theme
      theme = nextTheme(theme)
      return current
    })
    expect(new Set(seen).size).toBe(THEME_CYCLE.length)
    expect(theme).toBe('light')
  })
})

describe('themeClasses', () => {
  it('sets no class for light', () => {
    expect(themeClasses('light')).toEqual({ dark: false, drunk: false })
  })

  it('sets dark only for dark', () => {
    expect(themeClasses('dark')).toEqual({ dark: true, drunk: false })
  })

  it('builds drunk on the dark palette', () => {
    expect(themeClasses('drunk')).toEqual({ dark: true, drunk: true })
  })
})
