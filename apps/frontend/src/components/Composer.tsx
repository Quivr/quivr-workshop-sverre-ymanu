import { useState, type FormEvent } from 'react'

type Props = {
  isDisabled: boolean
  isRunning: boolean
  onSend: (text: string) => void
  onStop: () => void
}

export function Composer({ isDisabled, isRunning, onSend, onStop }: Props) {
  const [text, setText] = useState('')

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || isDisabled) return
    onSend(trimmed)
    setText('')
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex gap-2"
    >
      <input
        value={text}
        onChange={event => setText(event.target.value)}
        placeholder="Ask about your schedule, menus, libraries…"
        className="border-schedule-border-grey focus:border-heading bg-surface flex-1 rounded-md border px-3 py-2 outline-none"
        autoFocus
      />
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
          className="bg-main text-sidenav-blue rounded-md px-4 py-2 font-bold disabled:opacity-50"
        >
          Send
        </button>
      )}
    </form>
  )
}
