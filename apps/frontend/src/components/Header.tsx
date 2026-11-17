import { useEffect, useState } from 'react'

import type { Theme } from '../useTheme'

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
      <h1 className="font-title text-main mr-auto text-3xl tracking-wide">
        Ask Quivr
      </h1>
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
        aria-label={
          theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
        }
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>
    </header>
  )
}
