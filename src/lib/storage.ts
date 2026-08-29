import { AppData, EMPTY_DATA } from '../types'

const STORAGE_KEY = 'softballstat.data.v1'
const BACKUP_PREFIX = 'softballstat.corrupted-backup.'
const LAST_EXPORT_KEY = 'softballstat.lastExport.v1'

export type LoadResult =
  | { status: 'ok'; data: AppData }
  | { status: 'empty'; data: AppData }
  /**
   * The saved JSON couldn't be parsed. The raw string is preserved under a
   * timestamped backup key rather than discarded, and the caller should
   * hold off on writing anything back until the user has acknowledged this
   * (see DataProvider) — otherwise the very next autosave would silently
   * overwrite the corrupted-but-recoverable original with an empty dataset.
   */
  | { status: 'corrupted'; data: AppData; backupKey: string }

export function loadData(): LoadResult {
  let raw: string | null
  try {
    raw = localStorage.getItem(STORAGE_KEY)
  } catch (err) {
    console.error('Failed to read SoftballStat data from localStorage', err)
    return { status: 'empty', data: { ...EMPTY_DATA } }
  }

  if (!raw) return { status: 'empty', data: { ...EMPTY_DATA } }

  try {
    const parsed = JSON.parse(raw)
    // Merge with EMPTY_DATA so a future new field never crashes an older save.
    return { status: 'ok', data: { ...EMPTY_DATA, ...parsed } }
  } catch (err) {
    console.error('SoftballStat data in localStorage is corrupted; preserving it under a backup key', err)
    const backupKey = `${BACKUP_PREFIX}${Date.now()}`
    try {
      localStorage.setItem(backupKey, raw)
    } catch {
      // Best effort — if this also fails there's nothing more we can do.
    }
    return { status: 'corrupted', data: { ...EMPTY_DATA }, backupKey }
  }
}

/** Returns true on success so callers can surface a warning on failure instead of failing silently. */
export function saveData(data: AppData): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    return true
  } catch (err) {
    console.error('Failed to save SoftballStat data to localStorage', err)
    return false
  }
}

export function loadLastExportAt(): number | null {
  try {
    const raw = localStorage.getItem(LAST_EXPORT_KEY)
    return raw ? Number(raw) : null
  } catch {
    return null
  }
}

export function saveLastExportAt(timestamp: number): void {
  try {
    localStorage.setItem(LAST_EXPORT_KEY, String(timestamp))
  } catch (err) {
    console.error('Failed to record last export time', err)
  }
}

/**
 * Asks the browser to exempt this origin from its own automatic storage
 * eviction under disk pressure. Best-effort and silent: unsupported in some
 * browsers, and even where supported it may be granted or denied based on
 * site-engagement heuristics with no user-visible prompt. It does not, and
 * cannot, prevent a user (or Safari's ITP) from clearing site data outright.
 */
export async function requestPersistentStorage(): Promise<boolean | null> {
  try {
    if (navigator.storage?.persist) {
      if (await navigator.storage.persisted?.()) return true
      return await navigator.storage.persist()
    }
  } catch (err) {
    console.error('Could not request persistent storage', err)
  }
  return null
}
