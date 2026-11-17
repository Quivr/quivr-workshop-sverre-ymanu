import { useCallback, useEffect, useRef, useState } from 'react'

const STEPS = [
  {
    title: 'Hi, I am quivr-mannetje!',
    text: 'Hi, I am quivr-mannetje, your little guide. You can ask me about your schedule, restaurant menus and library occupancy in plain language, and in your own language.',
  },
  {
    title: 'Only your real data',
    text: "My answers come only from your real Quivr data. When the information isn't there, I will tell you that I don't know instead of making something up.",
  },
  {
    title: 'Cards and tool calls',
    text: 'When I look something up, you see a tool call. Menus and schedules show up as handy cards. Click a tool call to expand it and see its arguments and its result.',
  },
  {
    title: 'The header',
    text: 'In the header you can pick a model, open Traces to see recent agent runs, start a New chat, and switch between dark and light mode.',
  },
  {
    title: 'Give it a try',
    text: 'Not sure where to start? Try one of the example questions below the title. Press the question mark button any time to see this tour again.',
  },
]

const MUTED_KEY = 'mannetje-muted'
const SPEAK_DELAY_MS = 80
const IS_SPEECH_SUPPORTED =
  typeof window !== 'undefined' && 'speechSynthesis' in window

const readMuted = () => {
  try {
    return localStorage.getItem(MUTED_KEY) === 'true'
  } catch {
    return false
  }
}

const pickVoice = () => {
  if (!IS_SPEECH_SUPPORTED) return null
  const voices = window.speechSynthesis.getVoices()
  return (
    voices.find(voice => voice.lang.replace('_', '-') === 'en-GB') ??
    voices.find(voice => voice.lang.toLowerCase().startsWith('en')) ??
    null
  )
}

const iconButtonClass =
  'border-schedule-border-grey bg-surface text-heading hover:bg-cardbg pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full border text-sm shadow-sm'

function Mannetje({ isTalking }: { isTalking: boolean }) {
  return (
    <div className="quivr-mannetje-pop pointer-events-none h-12 w-12 shrink-0">
      <div className="quivr-mannetje-bob h-full w-full">
        <svg
          viewBox="0 0 48 48"
          className="h-full w-full"
          role="img"
          aria-label="quivr-mannetje"
        >
          <ellipse
            cx="15"
            cy="44"
            rx="5"
            ry="2.5"
            fill="#34495e"
          />
          <ellipse
            cx="33"
            cy="44"
            rx="5"
            ry="2.5"
            fill="#34495e"
          />
          <path
            d="M24 6 V1.5"
            stroke="#34495e"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle
            cx="24"
            cy="2.5"
            r="2"
            fill="#34495e"
          />
          <rect
            x="5"
            y="6"
            width="38"
            height="36"
            rx="16"
            fill="#ffd750"
            stroke="#34495e"
            strokeWidth="2.5"
          />
          <ellipse
            className="quivr-mannetje-eye"
            cx="17"
            cy="21"
            rx="3"
            ry="4"
            fill="#34495e"
          />
          <ellipse
            className="quivr-mannetje-eye"
            cx="31"
            cy="21"
            rx="3"
            ry="4"
            fill="#34495e"
          />
          {isTalking ? (
            <ellipse
              className="quivr-mannetje-mouth-talking"
              cx="24"
              cy="32"
              rx="4.5"
              ry="4"
              fill="#34495e"
            />
          ) : (
            <path
              d="M17 30 Q24 37 31 30"
              fill="none"
              stroke="#34495e"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          )}
        </svg>
      </div>
    </div>
  )
}

/** Little guide in the bottom-right corner: a short spoken tour of the app. */
export function QuivrMannetje() {
  const [isOpen, setIsOpen] = useState(true)
  const [step, setStep] = useState(0)
  const [isMuted, setIsMuted] = useState(readMuted)
  const [isTalking, setIsTalking] = useState(false)
  // True once the browser has actually started speaking (audio is unlocked)
  const [hasStarted, setHasStarted] = useState(false)
  // Bumped on first user interaction (or hint click) to retry blocked speech
  const [retryCount, setRetryCount] = useState(0)

  const bubbleRef = useRef<HTMLDivElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)
  const helpRef = useRef<HTMLButtonElement>(null)
  const shouldFocusNextRef = useRef(false)
  // Keep a reference so the utterance is not garbage collected mid-speech
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null)

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1
  const canSpeak = IS_SPEECH_SUPPORTED && !isMuted
  const shouldShowHint = canSpeak && !hasStarted

  const close = useCallback(() => {
    // Don't leave keyboard focus on a bubble that is about to disappear
    if (bubbleRef.current?.contains(document.activeElement)) {
      helpRef.current?.focus()
    }
    setIsOpen(false)
  }, [])

  const open = () => {
    shouldFocusNextRef.current = true
    setStep(0)
    setIsOpen(true)
  }

  const toggleMuted = () => {
    const next = !isMuted
    try {
      localStorage.setItem(MUTED_KEY, String(next))
    } catch {
      // Storage unavailable: the choice just won't persist
    }
    setIsMuted(next)
  }

  // Pick an English voice (voices load asynchronously in Chrome)
  useEffect(() => {
    if (!IS_SPEECH_SUPPORTED) return
    const synth = window.speechSynthesis
    const update = () => {
      voiceRef.current = pickVoice()
    }
    update()
    synth.addEventListener('voiceschanged', update)
    return () => synth.removeEventListener('voiceschanged', update)
  }, [])

  // Never keep talking after the page goes away
  useEffect(() => {
    if (!IS_SPEECH_SUPPORTED) return
    const stop = () => window.speechSynthesis.cancel()
    window.addEventListener('beforeunload', stop)
    return () => {
      window.removeEventListener('beforeunload', stop)
      stop()
    }
  }, [])

  // Speak the current step. The short delay lets StrictMode's double mount and
  // Chrome's cancel()-then-speak() quirk pass without overlapping utterances.
  useEffect(() => {
    const text = STEPS[step]?.text
    if (!IS_SPEECH_SUPPORTED || !isOpen || isMuted || !text) return
    const synth = window.speechSynthesis
    const timer = window.setTimeout(() => {
      synth.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'en-GB'
      utterance.pitch = 1.3
      utterance.rate = 1.05
      if (voiceRef.current) utterance.voice = voiceRef.current
      // Ignore events from utterances that were replaced or cancelled
      const isCurrent = () => utteranceRef.current === utterance
      utterance.onstart = () => {
        if (!isCurrent()) return
        setHasStarted(true)
        setIsTalking(true)
      }
      utterance.onend = () => {
        if (isCurrent()) setIsTalking(false)
      }
      utterance.onerror = () => {
        if (isCurrent()) setIsTalking(false)
      }
      utteranceRef.current = utterance
      synth.speak(utterance)
    }, SPEAK_DELAY_MS)

    return () => {
      window.clearTimeout(timer)
      utteranceRef.current = null
      synth.cancel()
      setIsTalking(false)
    }
  }, [isOpen, step, isMuted, retryCount])

  // Autoplay is usually blocked: the first interaction retries the current step
  useEffect(() => {
    if (!canSpeak || hasStarted) return
    const retry = () => {
      window.removeEventListener('click', retry, true)
      window.removeEventListener('keydown', retry, true)
      setRetryCount(count => count + 1)
    }
    window.addEventListener('click', retry, { once: true, capture: true })
    window.addEventListener('keydown', retry, { once: true, capture: true })
    return () => {
      window.removeEventListener('click', retry, true)
      window.removeEventListener('keydown', retry, true)
    }
  }, [canSpeak, hasStarted])

  // Escape closes the bubble
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, close])

  // After reopening with the "?" button, move focus into the bubble
  useEffect(() => {
    if (isOpen && shouldFocusNextRef.current) {
      shouldFocusNextRef.current = false
      nextRef.current?.focus()
    }
  }, [isOpen])

  return (
    <div className="pointer-events-none fixed right-3 bottom-24 z-50 flex max-w-[calc(100vw-1.5rem)] flex-col items-end gap-2 lg:right-4 lg:bottom-4">
      {isOpen && current && (
        <div
          ref={bubbleRef}
          role="dialog"
          aria-label="quivr-mannetje tour"
          className="quivr-mannetje-bubble border-schedule-border-grey bg-surface text-main-text pointer-events-auto relative w-72 max-w-full rounded-xl border p-3 text-sm shadow-lg"
        >
          <div className="mb-1 flex items-center gap-2">
            <span className="font-title text-heading mr-auto text-xl tracking-wide">
              {current.title}
            </span>
            {IS_SPEECH_SUPPORTED && (
              <button
                type="button"
                onClick={toggleMuted}
                aria-label={
                  isMuted ? 'Unmute quivr-mannetje' : 'Mute quivr-mannetje'
                }
                aria-pressed={isMuted}
                className="hover:bg-cardbg rounded px-1 text-base"
              >
                {isMuted ? '🔇' : '🔊'}
              </button>
            )}
          </div>
          <p
            aria-live="polite"
            className="break-words"
          >
            {current.text}
          </p>
          {shouldShowHint && (
            <button
              type="button"
              onClick={() => setRetryCount(count => count + 1)}
              className="text-muted mt-2 text-xs underline"
            >
              🔊 Click to hear me
            </button>
          )}
          <div className="mt-3 flex items-center gap-2">
            <span className="text-muted mr-auto text-xs">
              {step + 1} / {STEPS.length}
            </span>
            {!isLast && (
              <button
                type="button"
                onClick={close}
                aria-label="Skip the quivr-mannetje tour"
                className="text-muted hover:text-heading rounded px-2 py-1 text-xs"
              >
                Skip
              </button>
            )}
            <button
              ref={nextRef}
              type="button"
              onClick={isLast ? close : () => setStep(step + 1)}
              aria-label={
                isLast ? 'Finish the quivr-mannetje tour' : 'Next tip'
              }
              className="bg-main text-sidenav-blue rounded-md px-3 py-1 text-xs font-bold"
            >
              {isLast ? 'Done' : 'Next'}
            </button>
          </div>
          <span
            aria-hidden="true"
            className="border-schedule-border-grey bg-surface absolute right-[18px] -bottom-1.5 h-3 w-3 rotate-45 border-r border-b"
          />
        </div>
      )}
      <div className="flex items-end gap-2">
        <button
          ref={helpRef}
          type="button"
          onClick={open}
          aria-label="Show the quivr-mannetje tour"
          className={iconButtonClass}
        >
          ?
        </button>
        <Mannetje isTalking={isTalking} />
      </div>
    </div>
  )
}
