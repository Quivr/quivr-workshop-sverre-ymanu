import { useEffect, useState } from 'react'

import { THEME_LABEL, nextTheme, type Theme } from '../theme'

type Props = {
  models: string[]
  model: string
  theme: Theme
  isShowingTraces: boolean
  canCopyChat: boolean
  onCopyChat: () => Promise<boolean>
  onModelChange: (model: string) => void
  onNewChat: () => void
  onToggleTraces: () => void
  onToggleTheme: () => void
}

const buttonClass = 'rounded px-2 py-1 text-sm hover:bg-sidenav-secondary'

export function Header({
  models,
  model,
  theme,
  isShowingTraces,
  canCopyChat,
  onCopyChat,
  onModelChange,
  onNewChat,
  onToggleTraces,
  onToggleTheme,
}: Props) {
  const [copyState, setCopyState] = useState<'copied' | 'failed' | null>(null)

  useEffect(() => {
    if (!copyState) return
    const timer = setTimeout(() => setCopyState(null), 2000)
    return () => clearTimeout(timer)
  }, [copyState])

  const handleCopy = async () =>
    setCopyState((await onCopyChat()) ? 'copied' : 'failed')

  return (
    <header className="bg-sidenav-blue flex flex-wrap items-center gap-3 px-4 py-2 text-white">
      <img
        src="/logo.svg"
        alt=""
        className="h-8 w-8"
      />
      {/* dark-mode-ok: brand yellow on the fixed bg-sidenav-blue bar (6.67:1) in both themes */}
      <h1 className="font-title text-main mr-auto text-3xl tracking-wide">
        Ask Quivr
      </h1>
      {theme === 'drunk' && (
        <span
          aria-hidden="true"
          className="drunk-hic -ml-1 text-sm text-white italic"
        >
          hic!
        </span>
      )}
      <select
        value={model}
        onChange={event => onModelChange(event.target.value)}
        className="bg-sidenav-secondary rounded px-2 py-1 text-sm"
        aria-label="Model"
      >
        {models.map(id => (
          <option
            key={id}
            value={id}
          >
            {id}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={onToggleTraces}
        className={buttonClass}
      >
        {isShowingTraces ? 'Chat' : 'Traces'}
      </button>
      {canCopyChat && !isShowingTraces && (
        <button
          type="button"
          onClick={() => void handleCopy()}
          className={buttonClass}
          aria-live="polite"
        >
          {copyState === 'copied'
            ? 'Copied'
            : copyState === 'failed'
              ? 'Copy failed'
              : 'Copy chat'}
        </button>
      )}
      <button
        type="button"
        onClick={onNewChat}
        className={buttonClass}
      >
        New chat
      </button>
      <button
        type="button"
        onClick={onToggleTheme}
        className={buttonClass}
        aria-label={`Theme: ${THEME_LABEL[theme].name.toLowerCase()}. Switch to ${THEME_LABEL[nextTheme(theme)].name.toLowerCase()} mode`}
      >
        <span aria-hidden="true">
          {THEME_LABEL[theme].icon} {THEME_LABEL[theme].name}
        </span>
      </button>
    </header>
  )
}
