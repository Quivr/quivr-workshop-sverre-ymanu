import { SUGGESTED_QUESTIONS } from '../chatHelpers'

type Props = {
  isDisabled: boolean
  onPick: (question: string) => void
}

export function Welcome({ isDisabled, onPick }: Props) {
  return (
    <div className="space-y-4 pt-10 text-center">
      <p className="font-title text-sidenav-blue text-3xl">
        What do you want to know?
      </p>
      <p className="text-sm">
        Ask about menus, library seats or your schedule, or try one of these:
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {SUGGESTED_QUESTIONS.map(question => (
          <button
            key={question}
            type="button"
            disabled={isDisabled}
            onClick={() => onPick(question)}
            className="hover:bg-cardbg rounded-full bg-white px-3 py-2 text-sm shadow-sm disabled:opacity-50"
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  )
}
