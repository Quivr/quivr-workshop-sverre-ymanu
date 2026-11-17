import { useEffect, useState } from 'react'

import { storage } from './dice/browser'
import { loadStats, recordCheck, recordRoll, saveStats } from './dice/stats'

/** The little dice stat, shared by "Roll the dice" and the Dungeon mode checks. Saved in localStorage. */
export function useDiceStats() {
  const [stats, setStats] = useState(() => loadStats(storage()))

  useEffect(() => saveStats(storage(), stats), [stats])

  return {
    stats,
    addRoll: (roll: number) => setStats(current => recordRoll(current, roll)),
    addCheck: (passed: boolean) =>
      setStats(current => recordCheck(current, passed)),
  }
}
