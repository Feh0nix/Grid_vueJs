import { ref, computed, watch, onMounted } from 'vue'

type Theme = 'light' | 'dark' | 'auto'

const THEME_STORAGE_KEY = 'spreadsheet-theme'

const currentTheme = ref<Theme>('light')
const isDark = computed(() => {
  if (currentTheme.value === 'dark') return true
  if (currentTheme.value === 'auto') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  return false
})

export function useTheme() {
  const setTheme = (theme: Theme) => {
    currentTheme.value = theme
    localStorage.setItem(THEME_STORAGE_KEY, theme)
    applyTheme()
  }

  const toggleTheme = () => {
    const newTheme = isDark.value ? 'light' : 'dark'
    setTheme(newTheme)
  }

  const applyTheme = () => {
    const root = document.documentElement
    if (isDark.value) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }

  const initTheme = () => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null
    if (saved && ['light', 'dark', 'auto'].includes(saved)) {
      currentTheme.value = saved
    } else {
      currentTheme.value = 'light'
    }
    applyTheme()
  }

  // Watch for system theme changes when in auto mode
  onMounted(() => {
    initTheme()
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', () => {
      if (currentTheme.value === 'auto') {
        applyTheme()
      }
    })
  })

  watch(isDark, applyTheme)

  return {
    currentTheme: computed(() => currentTheme.value),
    isDark,
    setTheme,
    toggleTheme,
    initTheme,
  }
}

// Global theme state for use outside components
let globalToggle: (() => void) | null = null

export const themeState = {
  get isDark() {
    return isDark.value
  },
  setToggleFunction(fn: () => void) {
    globalToggle = fn
  },
  toggleTheme() {
    globalToggle?.()
  },
}
