// dark-mode-ok-file: the ads are a garish fixed-colour parody; each ad brings its own background and text colours in both themes
import { useCallback, useEffect, useRef, useState } from 'react'

import {
  FIRST_AD_MS,
  MAX_ADS,
  generateAd,
  nextGapMs,
  pickPosition,
  type Ad,
  type Position,
} from '../popupAds'

const isEnabled = import.meta.env.VITE_POPUP_ADS !== 'off'

type OpenAd = { id: number; ad: Ad; position: Position }

type DialogProps = {
  ad: Ad
  position: Position
  isTop: boolean
  onClose: () => void
  onMore: () => void
}

function AdDialog({ ad, position, isTop, onClose, onMore }: DialogProps) {
  const { palette } = ad

  useEffect(() => {
    if (!isTop) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isTop, onClose])

  return (
    <div
      role="dialog"
      aria-label="Advertisement"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: `translate(-${position.x}%, -${position.y}%) rotate(${ad.tilt}deg)`,
      }}
      className={`pointer-events-auto absolute w-80 max-w-[calc(100vw-1rem)] overflow-hidden rounded-md border-4 text-center shadow-2xl ${palette.frame} ${palette.body}`}
    >
      <div
        className={`flex items-center justify-between px-2 py-1 text-xs ${palette.header}`}
      >
        <span className="truncate">Ad · {ad.site}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close ad"
          className="ml-2 rounded bg-white px-2 py-0.5 font-bold text-black hover:bg-red-200"
        >
          ✕
        </button>
      </div>
      <div className="space-y-2 p-4">
        <p className="text-xs font-bold tracking-wide uppercase">{ad.kicker}</p>
        <p
          className="text-5xl"
          aria-hidden="true"
        >
          {ad.emoji}
        </p>
        <p
          className={`font-title text-2xl motion-safe:animate-pulse ${palette.headline}`}
        >
          {ad.headline}
        </p>
        <p className="text-sm">{ad.body}</p>
        <button
          type="button"
          onClick={onMore}
          className={`w-full rounded px-3 py-2 text-lg font-bold shadow ${palette.cta}`}
        >
          {ad.cta}
        </button>
        <button
          type="button"
          onClick={onMore}
          className="text-[11px] underline opacity-70 hover:opacity-100"
        >
          {ad.decline}
        </button>
        <p className="text-[10px] opacity-60">{ad.fineprint}</p>
      </div>
    </div>
  )
}

/**
 * Shows freshly generated fake popup ads at random spots, piling up on top of each other.
 * They never block the app underneath: only the ads themselves take clicks. Pressing an ad's
 * big button (or its sneaky "no thanks") opens yet another one.
 */
export function PopupAds() {
  const [ads, setAds] = useState<OpenAd[]>([])
  const nextId = useRef(0)

  const open = useCallback(() => {
    const next: OpenAd = {
      id: nextId.current++,
      ad: generateAd(Math.random),
      position: pickPosition(Math.random(), Math.random()),
    }
    setAds(current =>
      current.length >= MAX_ADS ? current : [...current, next]
    )
  }, [])

  useEffect(() => {
    if (!isEnabled) return
    let timer: ReturnType<typeof setTimeout>
    const schedule = (delay: number) => {
      timer = setTimeout(() => {
        open()
        schedule(nextGapMs(Math.random()))
      }, delay)
    }
    schedule(FIRST_AD_MS)
    return () => clearTimeout(timer)
  }, [open])

  return (
    <div className="pointer-events-none fixed inset-0 z-[60]">
      {ads.map((item, index) => (
        <AdDialog
          key={item.id}
          ad={item.ad}
          position={item.position}
          isTop={index === ads.length - 1}
          onClose={() =>
            setAds(current => current.filter(a => a.id !== item.id))
          }
          onMore={open}
        />
      ))}
      {ads.length > 0 && (
        <button
          type="button"
          onClick={() => setAds([])}
          className="bg-sidenav-blue pointer-events-auto absolute bottom-4 left-4 rounded-full px-4 py-2 text-sm font-bold text-white shadow-lg hover:opacity-90"
        >
          Close all ads ({ads.length})
        </button>
      )}
    </div>
  )
}
