/** Slash commands typed in the message box. They are handled in the app and never sent to the assistant. */

export type Command = { name: 'summon'; count: number }

/**
 * `/summon` calls one more quivr-mannetje, `/summon 25` calls 25. There is no
 * upper limit. Anything else (including `/summon lots`) is a normal message.
 */
export const parseCommand = (text: string): Command | null => {
  const match = /^\/summon(?:\s+(\d+))?$/i.exec(text.trim())
  if (!match) return null
  return { name: 'summon', count: match[1] ? Number(match[1]) : 1 }
}
