export const MAX_STRING_LENGTH = 500

// C0/C1 control characters (keeping \t and \n), zero-width and bidi override characters.
const INVISIBLE =
  // eslint-disable-next-line no-control-regex
  /[\u0000-\u0008\u000B-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/g

export const sanitiseString = (
  text: string,
  maxLength = MAX_STRING_LENGTH
): string => {
  const clean = text.replace(INVISIBLE, '')
  return clean.length > maxLength ? `${clean.slice(0, maxLength)}…` : clean
}

/**
 * Cleans every string in a tool result, as free text from Quivr (dish names,
 * titles, ...) ends up in the model's context. Keeps the shape intact.
 */
export const sanitise = (
  value: unknown,
  maxLength = MAX_STRING_LENGTH
): unknown => {
  if (typeof value === 'string') return sanitiseString(value, maxLength)
  if (Array.isArray(value)) return value.map(item => sanitise(item, maxLength))
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [
        key,
        sanitise(nested, maxLength),
      ])
    )
  }
  return value
}
