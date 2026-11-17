// dark-mode-ok-file: the mascot is brand artwork with fixed Quivr yellow/blue; its speech bubbles sit on bg-main
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'

import {
  describeElement,
  describeSelection,
  isOwnUi,
  type Explained,
} from '../explainDom'
import { placeSprite, usePrefersReducedMotion } from '../mannetjeDom'
import {
  bubblePlacement,
  MARGIN,
  standOn,
  type Point,
} from '../mannetjePlacement'
import {
  lookAt,
  moveToward,
  newRoamer,
  randomPoint,
  roam,
  RUN_SPEED,
  SIZE,
  SPIN_MS,
  WALK_SPEED,
  type Mode,
  type Pointer,
} from '../mannetjeRoam'
import { useExplain, type ExplainState } from '../useExplain'
import { MannetjeCrowd } from './MannetjeCrowd'
import { Mannetje } from './MannetjeSprite'

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
    text: 'In the header you can pick a model, open Traces to see recent agent runs, start a New chat, and cycle through the light, dark and (silly) drunk themes.',
  },
  {
    title: 'Explain anything',
    text: 'Press the magnifier button next to me, then click anything on the page or select some text. I will walk over, jump on it and explain it. Press Escape to stop.',
  },
  {
    title: 'Give it a try',
    text: 'Not sure where to start? Try one of the example questions below the title. Press the question mark button any time to see this tour again.',
  },
]

type ExplainStatus = ExplainState['status']

const MUTED_KEY = 'mannetje-muted'
const SPEAK_DELAY_MS = 80
// The opening tour moves on by itself: reading time = base + per character
const READ_BASE_MS = 4000
const READ_PER_CHAR_MS = 70
// An explanation stays up long enough to be read (and spoken) in full
const EXPLAIN_PER_CHAR_MS = 90
// Wait a moment after a click: a drag or double click ends in a text selection
const ELEMENT_CLICK_DELAY_MS = 250
const IS_SPEECH_SUPPORTED =
  typeof window !== 'undefined' && 'speechSynthesis' in window

const isPageVisible = () =>
  typeof document === 'undefined' || document.visibilityState === 'visible'

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
const iconButtonOnClass =
  'border-sidenav-blue bg-main text-sidenav-blue pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full border text-sm shadow-sm'

const homePoint = (element: HTMLElement | null): Point => {
  const rect = element?.getBoundingClientRect()
  return rect ? { x: rect.left, y: rect.top } : { x: MARGIN, y: MARGIN }
}

/** Little Q-shaped guide: gives a spoken tour, then wanders the screen and plays with the cursor. */
export function QuivrMannetje({
  model,
  summoned = 0,
}: {
  model: string
  /** How many extra mannetjes `/summon` has called so far. */
  summoned?: number
}) {
  const explainer = useExplain(model)
  const { state: explanation, dismiss: dismissExplanation } = explainer
  // Explain mode: clicks and text selections are explained instead of used
  const [isExplainMode, setIsExplainMode] = useState(false)
  const [isOpen, setIsOpen] = useState(true)
  // The tour that opens by itself closes by itself; one the user asked for stays
  const [isAutoTour, setIsAutoTour] = useState(true)
  // The auto tour only runs while the page is visible and the user is not
  // hovering over the bubble (they are reading it)
  const [isVisible, setIsVisible] = useState(isPageVisible)
  const [isHovering, setIsHovering] = useState(false)
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
  // Walking: the sprite is moved with a transform from an animation frame loop
  const spriteRef = useRef<HTMLDivElement>(null)
  const homeRef = useRef<HTMLDivElement>(null)
  const positionRef = useRef<Point>({ x: MARGIN, y: MARGIN })
  const isOpenRef = useRef(isOpen)
  const isReducedMotion = usePrefersReducedMotion()
  // What the animation loop needs to know without re-running (set in layout effects)
  const stepRef = useRef(step)
  const isHoveringRef = useRef(isHovering)
  const isTalkingRef = useRef(isTalking)
  const explainStatusRef = useRef<ExplainStatus>('idle')
  // Where the explained text is on screen: he walks there and jumps on it
  const anchorRef = useRef<(() => DOMRect | null) | null>(null)
  const bubbleBoxRef = useRef<HTMLDivElement>(null)

  const isExplaining = explanation.status !== 'idle'
  const current = STEPS[step]
  const spokenText = isExplaining
    ? explanation.status === 'done'
      ? explanation.text
      : undefined
    : current?.text
  const isLast = step === STEPS.length - 1
  const canSpeak = IS_SPEECH_SUPPORTED && !isMuted
  const shouldShowHint = canSpeak && !hasStarted && spokenText !== undefined

  const close = useCallback(() => {
    // Don't leave keyboard focus on a bubble that is about to disappear
    if (bubbleRef.current?.contains(document.activeElement)) {
      helpRef.current?.focus()
    }
    anchorRef.current = null
    setIsHovering(false)
    dismissExplanation()
    setIsOpen(false)
  }, [dismissExplanation])

  const open = () => {
    shouldFocusNextRef.current = true
    anchorRef.current = null
    setIsAutoTour(false)
    dismissExplanation()
    setStep(0)
    setIsOpen(true)
  }

  const toggleExplainMode = () => {
    // Explaining stands in for the tour: don't leave both going
    if (!isExplainMode && !isExplaining) setIsOpen(false)
    setIsExplainMode(value => !value)
  }

  const explainTarget = ({ target, anchor }: Explained) => {
    anchorRef.current = anchor
    setIsAutoTour(false)
    setIsHovering(false)
    setIsOpen(true)
    void explainer.explain(target)
  }
  const explainTargetRef = useRef(explainTarget)
  useEffect(() => {
    explainTargetRef.current = explainTarget
  })

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
    const text = spokenText
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
  }, [isOpen, spokenText, isMuted, retryCount])

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

  useEffect(() => {
    const update = () => setIsVisible(isPageVisible())
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [])

  // While the tour is open he is pinned home, so an ignored tour must not hold
  // him there forever. The opening tour therefore walks through the steps by
  // itself, each shown long enough to read (and speak), and closes after the
  // last one. It waits while the page is hidden or the bubble is hovered. It
  // does not depend on the window having focus: you can watch it unfocused.
  useEffect(() => {
    if (!isOpen || isExplaining || !isAutoTour || !isVisible || isHovering) {
      return
    }
    const delay =
      READ_BASE_MS + (STEPS[step]?.text.length ?? 0) * READ_PER_CHAR_MS
    const timer = window.setTimeout(
      isLast ? close : () => setStep(value => value + 1),
      delay
    )
    return () => window.clearTimeout(timer)
  }, [
    isOpen,
    isExplaining,
    isAutoTour,
    isVisible,
    isHovering,
    step,
    isLast,
    close,
  ])

  // An explanation (or its error) closes itself once it has been read, so he
  // goes back to roaming. One that is still loading ends when the request does.
  useEffect(() => {
    if (!isOpen || !isVisible || isHovering) return
    if (explanation.status !== 'done' && explanation.status !== 'error') return
    const length =
      explanation.status === 'done'
        ? explanation.text.length
        : explanation.message.length
    const timer = window.setTimeout(
      close,
      READ_BASE_MS + length * EXPLAIN_PER_CHAR_MS
    )
    return () => window.clearTimeout(timer)
  }, [isOpen, explanation, isVisible, isHovering, close])

  // Explain mode: the next click or text selection is explained, not used
  useEffect(() => {
    if (!isExplainMode) return
    const root = document.documentElement
    root.classList.add('quivr-explain-mode')
    let hovered: Element | null = null
    let pending = 0

    const unhover = () => hovered?.classList.remove('quivr-explain-hover')

    const handleOver = (event: MouseEvent) => {
      unhover()
      hovered =
        event.target instanceof Element && !isOwnUi(event.target)
          ? event.target
          : null
      hovered?.classList.add('quivr-explain-hover')
    }

    const handleClick = (event: MouseEvent) => {
      if (isOwnUi(event.target) || !(event.target instanceof Element)) return
      // The click is for the mannetje, not for the button underneath
      event.preventDefault()
      event.stopPropagation()
      const element = event.target
      window.clearTimeout(pending)
      pending = window.setTimeout(() => {
        if (!describeSelection()) {
          explainTargetRef.current(describeElement(element))
        }
      }, ELEMENT_CLICK_DELAY_MS)
    }

    // After the mouse is released the selection is final
    const handleMouseUp = (event: MouseEvent) => {
      if (isOwnUi(event.target)) return
      window.setTimeout(() => {
        const target = describeSelection()
        if (!target) return
        window.clearTimeout(pending)
        explainTargetRef.current(target)
      }, 0)
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsExplainMode(false)
    }

    window.addEventListener('mouseover', handleOver, true)
    window.addEventListener('click', handleClick, true)
    window.addEventListener('mouseup', handleMouseUp, true)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('mouseover', handleOver, true)
      window.removeEventListener('click', handleClick, true)
      window.removeEventListener('mouseup', handleMouseUp, true)
      window.removeEventListener('keydown', handleKeyDown)
      window.clearTimeout(pending)
      unhover()
      root.classList.remove('quivr-explain-mode')
    }
  }, [isExplainMode])

  // Updated in a layout effect so the animation loop never reads a stale value
  useLayoutEffect(() => {
    isOpenRef.current = isOpen
    stepRef.current = step
    isHoveringRef.current = isHovering
    isTalkingRef.current = isTalking
    explainStatusRef.current = explanation.status
  }, [isOpen, step, isHovering, isTalking, explanation.status])

  const getPosition = useCallback(() => positionRef.current, [])

  // The bubble hangs on him: it goes above (or below) the sprite, inside the
  // viewport. The loop calls this every frame while he walks.
  const layoutBubble = useCallback(() => {
    const bubble = bubbleBoxRef.current
    if (!bubble) return
    const position = positionRef.current
    const placement = bubblePlacement(
      position,
      SIZE,
      { width: bubble.offsetWidth, height: bubble.offsetHeight },
      { width: window.innerWidth, height: window.innerHeight }
    )
    bubble.style.transform = `translate3d(${(placement.x - position.x).toFixed(1)}px, ${(placement.y - position.y).toFixed(1)}px, 0)`
    bubble.style.setProperty('--tail-x', `${placement.tailX.toFixed(1)}px`)
    if (bubble.dataset.side !== placement.side) {
      bubble.dataset.side = placement.side
    }
  }, [])
  // Also after every render: the text (and so the size) of the bubble changes
  useLayoutEffect(() => {
    layoutBubble()
  })

  // Start at home (next to the "?" button) before the first paint. The point
  // is copied into the existing object: the animation loop holds a reference.
  useLayoutEffect(() => {
    const sprite = spriteRef.current
    if (!sprite) return
    Object.assign(positionRef.current, homePoint(homeRef.current))
    placeSprite(sprite, positionRef.current)
    layoutBubble()
  }, [layoutBubble])

  // Walking around and playing with the cursor. While the tour is open he
  // stays (or runs back) home so the bubble points at him.
  useEffect(() => {
    const sprite = spriteRef.current
    if (!sprite) return

    if (isReducedMotion) {
      // No roaming: just sit at home
      const goHome = () => {
        Object.assign(positionRef.current, homePoint(homeRef.current))
        placeSprite(sprite, positionRef.current)
        layoutBubble()
      }
      sprite.dataset.mode = 'idle'
      goHome()
      window.addEventListener('resize', goHome)
      return () => window.removeEventListener('resize', goHome)
    }

    const position = positionRef.current
    const viewport = () => ({
      width: window.innerWidth,
      height: window.innerHeight,
    })
    let frame = 0
    let last = performance.now()
    const roamer = newRoamer(last, 2500)
    let pointer: Pointer | null = null
    let look = ''
    let lastStep = stepRef.current
    let wasOpen = isOpenRef.current

    const handleMove = (event: PointerEvent) => {
      pointer = { x: event.clientX, y: event.clientY, at: performance.now() }
    }

    // Click close to him and he does a little spin
    const handleDown = (event: PointerEvent) => {
      if (isOpenRef.current) return
      const dx = event.clientX - (position.x + SIZE / 2)
      const dy = event.clientY - (position.y + SIZE / 2)
      if (Math.hypot(dx, dy) < 100) {
        roamer.spinUntil = performance.now() + SPIN_MS
      }
    }

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now

      let mode: Mode = 'idle'
      let speed: number
      const isBubbleOpen = isOpenRef.current
      // Explaining: he runs to the text and stands on it (re-read every frame:
      // the page can scroll). Without an anchor he stays where he is.
      const anchor =
        isBubbleOpen && explainStatusRef.current !== 'idle'
          ? anchorRef.current?.()
          : null
      let isAtText = false

      if (isBubbleOpen !== wasOpen) {
        wasOpen = isBubbleOpen
        // The bubble closed: a short breather, then he roams again
        if (!isBubbleOpen) roamer.idleUntil = now + 1500
      }

      if (anchor) {
        roamer.target = standOn(anchor, SIZE, viewport())
        speed = RUN_SPEED
        isAtText =
          Math.hypot(
            roamer.target.x - position.x,
            roamer.target.y - position.y
          ) <= 2
      } else if (isBubbleOpen) {
        // The tour: he stays put while it is read, and moves on to a new spot
        // with each step. He stands still while the bubble is hovered, so
        // Next/Skip never run away from the cursor.
        if (stepRef.current !== lastStep) {
          lastStep = stepRef.current
          if (!isHoveringRef.current) roamer.target = randomPoint(viewport())
        }
        if (isHoveringRef.current) roamer.target = null
        speed = WALK_SPEED * 1.5
      } else {
        ;({ mode, speed } = roam(roamer, position, pointer, now, viewport()))
      }

      const { isWalking, heading } = moveToward(
        roamer,
        position,
        speed,
        dt,
        now,
        viewport()
      )
      if (isWalking) mode = 'walk'

      placeSprite(sprite, position)
      layoutBubble()
      // Jumps on the text while he waits for the answer and while he talks
      if (
        isAtText &&
        mode === 'idle' &&
        (explainStatusRef.current === 'loading' || isTalkingRef.current)
      ) {
        mode = 'hop'
      }
      if (sprite.dataset.mode !== mode) sprite.dataset.mode = mode

      // Eyes follow the cursor, or the direction he is walking in
      const eyes = lookAt(position, pointer, now, heading)
      const nextLook = `${eyes.x.toFixed(1)} ${eyes.y.toFixed(1)}`
      if (nextLook !== look) {
        look = nextLook
        sprite.style.setProperty('--look-x', `${eyes.x.toFixed(1)}px`)
        sprite.style.setProperty('--look-y', `${eyes.y.toFixed(1)}px`)
      }

      frame = requestAnimationFrame(tick)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerdown', handleDown)
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerdown', handleDown)
    }
  }, [isReducedMotion, layoutBubble])

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
    <>
      <MannetjeCrowd
        count={summoned}
        origin={getPosition}
      />
      <div
        ref={spriteRef}
        data-mode="idle"
        data-quivr-mannetje=""
        className="quivr-mannetje pointer-events-none fixed top-0 left-0 z-50 h-14 w-14"
      >
        <Mannetje isTalking={isTalking} />
        {isOpen && current && (
          <div
            ref={bubbleBoxRef}
            className="absolute top-0 left-0 w-72 max-w-[calc(100vw-1rem)]"
          >
            <div
              ref={bubbleRef}
              role="dialog"
              aria-label={
                isExplaining
                  ? 'quivr-mannetje explanation'
                  : 'quivr-mannetje tour'
              }
              onPointerEnter={() => setIsHovering(true)}
              onPointerLeave={() => setIsHovering(false)}
              className="quivr-mannetje-bubble border-schedule-border-grey bg-surface text-main-text pointer-events-auto relative w-full rounded-xl border p-3 text-sm shadow-lg"
            >
              <div className="mb-1 flex items-center gap-2">
                <span className="font-title text-heading mr-auto truncate text-xl tracking-wide">
                  {isExplaining ? explanation.label : current.title}
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
                {explanation.status === 'idle' && current.text}
                {explanation.status === 'loading' && (
                  <span className="text-muted animate-pulse">
                    Let me take a look…
                  </span>
                )}
                {explanation.status === 'done' && explanation.text}
                {explanation.status === 'error' && (
                  <span className="text-danger-text">
                    {explanation.message}
                  </span>
                )}
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
              {isExplaining ? (
                <div className="mt-3 flex items-center justify-end gap-2">
                  <button
                    ref={nextRef}
                    type="button"
                    onClick={close}
                    aria-label="Close the explanation"
                    className="bg-main text-sidenav-blue rounded-md px-3 py-1 text-xs font-bold"
                  >
                    Thanks
                  </button>
                </div>
              ) : (
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
              )}
              <span
                aria-hidden="true"
                className="quivr-mannetje-tail border-schedule-border-grey bg-surface absolute h-3 w-3 border-r border-b"
              />
            </div>
          </div>
        )}
      </div>
      <div
        data-quivr-mannetje=""
        className="pointer-events-none fixed right-3 bottom-24 z-50 flex max-w-[calc(100vw-1.5rem)] flex-col items-end gap-2 lg:right-4 lg:bottom-4"
      >
        {isExplainMode && !isOpen && (
          <p className="bg-main text-sidenav-blue pointer-events-auto rounded-full px-3 py-1 text-xs font-bold shadow-lg">
            Click something or select text. Esc to stop.
          </p>
        )}
        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={toggleExplainMode}
            aria-label={
              isExplainMode
                ? 'Stop explaining'
                : 'Explain something: then click an element or select text'
            }
            aria-pressed={isExplainMode}
            title="Explain something"
            className={isExplainMode ? iconButtonOnClass : iconButtonClass}
          >
            🔍
          </button>
          <button
            ref={helpRef}
            type="button"
            onClick={open}
            aria-label="Show the quivr-mannetje tour"
            className={iconButtonClass}
          >
            ?
          </button>
          {/* Home spot: where he starts, next to the buttons */}
          <div
            ref={homeRef}
            aria-hidden="true"
            className="h-14 w-14 shrink-0"
          />
        </div>
      </div>
    </>
  )
}
