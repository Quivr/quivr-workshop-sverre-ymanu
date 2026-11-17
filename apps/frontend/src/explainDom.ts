import { elementTarget, selectionTarget, type ExplainTarget } from './explain'

/** Marks quivr-mannetje's own UI, which is never explained. */
export const OWN_UI_ATTRIBUTE = 'data-quivr-mannetje'

const CONTAINERS = 'article, section, details, li, form, header, footer, main'
const MAX_PATH = 3

export const isOwnUi = (target: EventTarget | null) =>
  target instanceof Element && target.closest(`[${OWN_UI_ATTRIBUTE}]`) !== null

const textOf = (element: Element) =>
  element instanceof HTMLElement
    ? element.innerText
    : (element.textContent ?? '')

const pathOf = (element: Element) => {
  const names: string[] = []
  for (
    let parent = element.parentElement;
    parent && names.length < MAX_PATH;
    parent = parent.parentElement
  ) {
    if (parent.matches('header, footer, main, nav, aside, details, form')) {
      names.push(parent.tagName.toLowerCase())
    }
  }
  return names
}

/** The nearest card, chat bubble or list item around an element (or the element itself if it is one). */
const containerOf = (element: Element) =>
  element.closest(CONTAINERS) ?? element.parentElement ?? element

/** What to explain, and where it is on screen (re-read every frame: the page can scroll). */
export type Explained = {
  target: ExplainTarget
  anchor: () => DOMRect | null
}

const visibleRect = (rect: DOMRect | undefined) =>
  rect && (rect.width > 0 || rect.height > 0) ? rect : null

export const describeElement = (element: Element): Explained => ({
  anchor: () =>
    element.isConnected ? visibleRect(element.getBoundingClientRect()) : null,
  target: elementTarget({
    tag: element.tagName.toLowerCase(),
    role: element.getAttribute('role'),
    ariaLabel: element.getAttribute('aria-label'),
    title: element.getAttribute('title'),
    placeholder: element.getAttribute('placeholder'),
    // Never the value of an input: it may be something the student is typing
    text: element instanceof HTMLInputElement ? '' : textOf(element),
    around: textOf(containerOf(element)),
    path: pathOf(element),
  }),
})

/** The current text selection, or null when nothing (or only whitespace) is selected. */
export const describeSelection = (): Explained | null => {
  const selection = window.getSelection()
  const text = selection?.toString().trim() ?? ''
  if (!selection || text.length < 2) return null
  const node = selection.anchorNode
  const element = node instanceof Element ? node : node?.parentElement
  // The selection itself disappears on the next click: keep our own copy
  const range = selection.rangeCount
    ? selection.getRangeAt(0).cloneRange()
    : null
  return {
    // The first line: a long selection spans many lines, he stands on the top one
    anchor: () =>
      range
        ? visibleRect(
            range.getClientRects()[0] ?? range.getBoundingClientRect()
          )
        : null,
    target: selectionTarget(text, element ? textOf(containerOf(element)) : ''),
  }
}
