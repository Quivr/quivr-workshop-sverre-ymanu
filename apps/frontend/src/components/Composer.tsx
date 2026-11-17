import type { FormEvent, Ref } from 'react'

import type { RollMode } from '../dice/check'

type Props = {
  value: string
  isDisabled: boolean
  isRunning: boolean
  /** Set in Dungeon mode: Send rolls a check first. */
  check: { dc: number; mode: RollMode } | null
  inputRef: Ref<HTMLInputElement>
  onChange: (value: string) => void
  onSend: (text: string) => void
  onStop: () => void
}

const MODE_BADGES = {
  advantage: {
    label: 'Advantage',
    title: 'Inspiration: your next check rolls two d20 and keeps the higher',
    className: 'bg-ok-tint text-ok-text',
  },
  disadvantage: {
    label: 'Disadvantage',
    title: 'Critical fail: your next check rolls two d20 and keeps the lower',
    className: 'bg-danger/10 text-danger-text',
  },
}

export function Composer({
  value,
  isDisabled,
  isRunning,
  check,
  inputRef,
  onChange,
  onSend,
  onStop,
}: Props) {
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = value.trim()
    if (!trimmed || isDisabled) return
    onSend(trimmed)
  }

  const badge =
    check && check.mode !== 'normal' ? MODE_BADGES[check.mode] : null

  return (
    <form
      onSubmit={handleSubmit}
      className="flex gap-2"
    >
      <input
        ref={inputRef}
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder="Ask about your schedule, menus, libraries…"
        className="border-schedule-border-grey focus:border-heading bg-surface placeholder:text-muted min-w-0 flex-1 rounded-md border px-3 py-2 outline-none"
        autoFocus
      />
      {check && !isRunning && (
        <span
          className="flex flex-col items-end justify-center gap-0.5 text-xs"
          title={`Dungeon mode: roll a d20 against DC ${check.dc} to send`}
        >
          <span className="text-muted">DC {check.dc}</span>
          {badge && (
            <span
              title={badge.title}
              className={`rounded px-1.5 font-bold ${badge.className}`}
            >
              {badge.label}
            </span>
          )}
        </span>
      )}
      {isRunning ? (
        <button
          type="button"
          onClick={onStop}
          className="bg-sidenav-blue rounded-md px-4 py-2 font-bold text-white"
        >
          Stop
        </button>
      ) : (
        <button
          type="submit"
          disabled={isDisabled}
          // dark-mode-ok: dark text on the brand yellow bg-main (6.67:1) in both themes
          className="bg-main text-sidenav-blue rounded-md px-4 py-2 font-bold disabled:opacity-50"
        >
          {check ? 'Roll to send' : 'Send'}
        </button>
      )}
    </form>
  )
}
