export const STATS_KEY = 'ask-quivr-dice-stats'
export const STATS_VERSION = 2

export type DiceStats = {
  rolls: number
  nat20: number
  nat1: number
  checksPassed: number
  checksFailed: number
}

export const EMPTY_STATS: DiceStats = {
  rolls: 0,
  nat20: 0,
  nat1: 0,
  checksPassed: 0,
  checksFailed: 0,
}

type StatsStorage = Pick<Storage, 'getItem' | 'setItem'>

export const recordRoll = (stats: DiceStats, roll: number): DiceStats => ({
  ...stats,
  rolls: stats.rolls + 1,
  nat20: stats.nat20 + (roll === 20 ? 1 : 0),
  nat1: stats.nat1 + (roll === 1 ? 1 : 0),
})

export const recordCheck = (stats: DiceStats, passed: boolean): DiceStats => ({
  ...stats,
  checksPassed: stats.checksPassed + (passed ? 1 : 0),
  checksFailed: stats.checksFailed + (passed ? 0 : 1),
})

const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0

/** Version 1 (dice only) is migrated with no checks. Anything else invalid resets to empty. Never throws. */
export const parseStats = (raw: string | null): DiceStats => {
  if (!raw) return EMPTY_STATS
  try {
    const data: unknown = JSON.parse(raw)
    if (typeof data !== 'object' || data === null) return EMPTY_STATS
    const { version, rolls, nat20, nat1, checksPassed, checksFailed } =
      data as Record<string, unknown>
    if (version !== 1 && version !== STATS_VERSION) return EMPTY_STATS
    if (!isCount(rolls) || !isCount(nat20) || !isCount(nat1)) return EMPTY_STATS
    if (nat20 + nat1 > rolls) return EMPTY_STATS
    if (version === 1) return { ...EMPTY_STATS, rolls, nat20, nat1 }
    if (!isCount(checksPassed) || !isCount(checksFailed)) return EMPTY_STATS
    return { rolls, nat20, nat1, checksPassed, checksFailed }
  } catch {
    return EMPTY_STATS
  }
}

export const serialiseStats = (stats: DiceStats): string =>
  JSON.stringify({ version: STATS_VERSION, ...stats })

export const loadStats = (storage: StatsStorage): DiceStats => {
  try {
    return parseStats(storage.getItem(STATS_KEY))
  } catch {
    return EMPTY_STATS
  }
}

export const saveStats = (storage: StatsStorage, stats: DiceStats) => {
  try {
    storage.setItem(STATS_KEY, serialiseStats(stats))
  } catch {
    // storage full or blocked: the stat is only for fun
  }
}

/** "Checks 5/8" is passed out of all checks, and only shows once a check was rolled. */
export const formatStats = ({
  rolls,
  nat20,
  nat1,
  checksPassed,
  checksFailed,
}: DiceStats): string => {
  const line = `Rolls ${rolls} · 🍀 ${nat20} · 💀 ${nat1}`
  const checks = checksPassed + checksFailed
  return checks > 0 ? `${line} · Checks ${checksPassed}/${checks}` : line
}
