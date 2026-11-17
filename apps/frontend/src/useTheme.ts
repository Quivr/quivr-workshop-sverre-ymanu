import { useEffect, useState } from 'react'

import { nextTheme, resolveTheme, themeClasses, type Theme } from './theme'

export type { Theme }

const STORAGE_KEY = 'theme'

const initialTheme = (): Theme =>
  resolveTheme(
    localStorage.getItem(STORAGE_KEY),
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )

/** Light/dark/drunk theme: saved choice first, then the OS setting. Sets classes on <html>, see theme.ts. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(initialTheme)

  useEffect(() => {
    const classes = themeClasses(theme)
    document.documentElement.classList.toggle('dark', classes.dark)
    document.documentElement.classList.toggle('drunk', classes.drunk)
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const toggle = () => setTheme(nextTheme)

  return { theme, toggle }
}
