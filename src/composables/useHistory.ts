import { ref, computed } from 'vue'
import type { Sheet, CellData } from '../types/spreadsheet'
import { deepClone, generateId } from '../utils/helpers'

export interface HistoryEntry {
  id: string
  timestamp: number
  sheets: Sheet[]
  activeSheetId: string
  sheetsData: Record<string, Record<string, CellData>>
  description: string
}

export function useHistory(limit: number = 50) {
  const history = ref<HistoryEntry[]>([])
  const currentIndex = ref(-1)
  
  const canUndo = computed(() => currentIndex.value > 0)
  const canRedo = computed(() => currentIndex.value < history.value.length - 1)
  const historyCount = computed(() => history.value.length)
  
  // Push a new state to history
  const push = (
    sheets: Sheet[],
    activeSheetId: string,
    sheetsData: Record<string, Record<string, CellData>>,
    description: string = 'Action'
  ) => {
    // Remove any future history if we're not at the end
    if (currentIndex.value < history.value.length - 1) {
      history.value = history.value.slice(0, currentIndex.value + 1)
    }
    
    // Create snapshot
    const entry: HistoryEntry = {
      id: generateId(),
      timestamp: Date.now(),
      sheets: deepClone(sheets),
      activeSheetId: deepClone(activeSheetId),
      sheetsData: deepClone(sheetsData),
      description
    }
    
    history.value.push(entry)
    currentIndex.value++
    
    // Limit history size
    if (history.value.length > limit) {
      history.value.shift()
      currentIndex.value--
    }
  }
  
  // Undo - go back one step
  const undo = (): HistoryEntry | null => {
    if (!canUndo.value) return null
    
    currentIndex.value--
    const entry = history.value[currentIndex.value]
    return deepClone(entry)
  }
  
  // Redo - go forward one step
  const redo = (): HistoryEntry | null => {
    if (!canRedo.value) return null
    
    currentIndex.value++
    const entry = history.value[currentIndex.value]
    return deepClone(entry)
  }
  
  // Get current state
  const getCurrent = (): HistoryEntry | null => {
    if (currentIndex.value < 0 || currentIndex.value >= history.value.length) {
      return null
    }
    return deepClone(history.value[currentIndex.value])
  }
  
  // Clear all history
  const clear = () => {
    history.value = []
    currentIndex.value = -1
  }
  
  // Get history list for display
  const getHistoryList = computed(() => {
    return history.value.map((entry, index) => ({
      ...entry,
      isCurrent: index === currentIndex.value
    }))
  })
  
  // Jump to specific history entry
  const jumpTo = (index: number): HistoryEntry | null => {
    if (index < 0 || index >= history.value.length) return null
    
    currentIndex.value = index
    return deepClone(history.value[index])
  }
  
  return {
    history: computed(() => history.value),
    currentIndex: computed(() => currentIndex.value),
    canUndo,
    canRedo,
    historyCount,
    getHistoryList,
    push,
    undo,
    redo,
    getCurrent,
    clear,
    jumpTo
  }
}
