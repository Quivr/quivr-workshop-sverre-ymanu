export const DUNGEON_KEY = 'ask-quivr-dungeon-mode-v1'

/** On unless the student turned it off. */
export const DEFAULT_DUNGEON_MODE = true

type ModeStorage = Pick<Storage, 'getItem' | 'setItem'>

/** Only 'on' and 'off' are valid; anything else falls back to the default. */
export const parseDungeonMode = (raw: string | null): boolean =>
  raw === 'on' ? true : raw === 'off' ? false : DEFAULT_DUNGEON_MODE

export const loadDungeonMode = (storage: ModeStorage): boolean => {
  try {
    return parseDungeonMode(storage.getItem(DUNGEON_KEY))
  } catch {
    return DEFAULT_DUNGEON_MODE
  }
}

export const saveDungeonMode = (storage: ModeStorage, isOn: boolean) => {
  try {
    storage.setItem(DUNGEON_KEY, isOn ? 'on' : 'off')
  } catch {
    // storage full or blocked: the setting just won't survive a reload
  }
}
