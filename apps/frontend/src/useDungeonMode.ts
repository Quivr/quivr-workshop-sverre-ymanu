import { useEffect, useState } from 'react'

import { storage } from './dice/browser'
import { loadDungeonMode, saveDungeonMode } from './dice/dungeonMode'

/** Dungeon mode on/off: saved choice first, on by default. */
export function useDungeonMode() {
  const [isOn, setIsOn] = useState(() => loadDungeonMode(storage()))

  useEffect(() => saveDungeonMode(storage(), isOn), [isOn])

  return { isDungeonMode: isOn, toggle: () => setIsOn(current => !current) }
}
