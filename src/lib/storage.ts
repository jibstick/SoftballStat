import { AppData, EMPTY_DATA } from '../types'

const STORAGE_KEY = 'softballstat.data.v1'

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...EMPTY_DATA }
    const parsed = JSON.parse(raw)
    // Merge with EMPTY_DATA so a future new field never crashes an older save.
    return { ...EMPTY_DATA, ...parsed }
  } catch (err) {
    console.error('Failed to load SoftballStat data from localStorage', err)
    return { ...EMPTY_DATA }
  }
}

export function saveData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (err) {
    console.error('Failed to save SoftballStat data to localStorage', err)
  }
}
