export type Theme = 'light' | 'dark' | 'drunk'

/** Order of the header toggle: light -> dark -> drunk -> light. */
export const THEME_CYCLE: readonly Theme[] = ['light', 'dark', 'drunk']

/** Only a valid saved value counts. Anything else (null, junk, old formats) is ignored. */
export const parseTheme = (stored: string | null): Theme | null =>
  THEME_CYCLE.find(theme => theme === stored) ?? null

/** Saved choice first, then the OS setting. */
export const resolveTheme = (
  stored: string | null,
  prefersDark: boolean
): Theme => parseTheme(stored) ?? (prefersDark ? 'dark' : 'light')

export const nextTheme = (theme: Theme): Theme =>
  THEME_CYCLE[(THEME_CYCLE.indexOf(theme) + 1) % THEME_CYCLE.length] ?? 'light'

/**
 * Drunk builds on the dark palette: it sets `dark` as well as `drunk`, so every
 * `dark:` style, the dark tokens and the dark-mode guard keep working. `.drunk`
 * in index.css then only re-tints the tokens and adds the nausea warp and sway.
 * Keep in sync with the inline script in index.html.
 */
export const themeClasses = (
  theme: Theme
): { dark: boolean; drunk: boolean } => ({
  dark: theme === 'dark' || theme === 'drunk',
  drunk: theme === 'drunk',
})

export const THEME_LABEL: Record<Theme, { icon: string; name: string }> = {
  light: { icon: '☀️', name: 'Light' },
  dark: { icon: '🌙', name: 'Dark' },
  drunk: { icon: '🥴', name: 'Drunk' },
}
