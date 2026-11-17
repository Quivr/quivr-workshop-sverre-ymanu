// dark-mode-ok-file: black letterbox behind the video in both themes

const VIDEO_ID = import.meta.env.VITE_SIDE_VIDEO_ID ?? 'QPW3XwBoQlw'

// Autoplay only works muted. `loop` needs `playlist` set to the same id.
const SRC =
  `https://www.youtube-nocookie.com/embed/${VIDEO_ID}` +
  `?autoplay=1&mute=1&loop=1&playlist=${VIDEO_ID}&controls=0&playsinline=1&rel=0`

/** Endless-runner gameplay in the margin. Only shown when there is room next to the chat column. */
export function SideVideo() {
  return (
    <aside className="fixed top-20 right-4 hidden w-56 overflow-hidden rounded-lg bg-black shadow-lg xl:block">
      <iframe
        src={SRC}
        title="Subway Surfers gameplay"
        allow="autoplay; encrypted-media; picture-in-picture"
        referrerPolicy="strict-origin-when-cross-origin"
        tabIndex={-1}
        className="pointer-events-none aspect-[9/16] w-full"
      />
    </aside>
  )
}
