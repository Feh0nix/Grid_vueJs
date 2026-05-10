<template>
  <div class="flex items-center gap-0 px-2 py-1 bg-gs-bg-secondary border-b border-gs-border-light h-9 dark:bg-gs-dark-surface dark:border-gs-border-dark">
    <!-- Cell Reference -->
    <div class="min-w-[60px] h-7 px-2 bg-gs-bg-primary border border-gs-border-light rounded-gs text-sm font-medium text-gs-text-primary flex items-center justify-center dark:bg-gs-dark-bg dark:border-gs-border-dark dark:text-gs-dark-text-primary">
      {{ cellRef }}
    </div>
    
    <!-- Function Button -->
    <BaseTooltip content="Insérer une fonction">
      <button
        class="flex items-center justify-center w-7 h-7 ml-1 rounded-gs text-primary-500 hover:bg-primary-50 transition-colors dark:hover:bg-primary-900/20"
        @click="$emit('insertFunction')"
      >
        <span class="font-serif italic text-sm font-semibold">fx</span>
      </button>
    </BaseTooltip>
    
    <!-- Formula Input -->
    <div class="flex-1 ml-1">
      <input
        ref="inputRef"
        type="text"
        class="w-full h-7 px-2 text-sm bg-gs-bg-primary border border-gs-border-light rounded-gs text-gs-text-primary placeholder:text-gs-text-tertiary focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:bg-gs-dark-bg dark:border-gs-border-dark dark:text-gs-dark-text-primary dark:placeholder:text-gs-dark-text-tertiary"
        :value="inputValue"
        @input="onInput"
        @keydown.enter="onConfirm"
        @blur="onConfirm"
        placeholder="Entrez une valeur ou formule (=...)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { CellPosition } from '../types/spreadsheet'
import { coordsToCellRef } from '../utils/helpers'
import BaseTooltip from './ui/BaseTooltip.vue'

interface Props {
  selectedCell: CellPosition | null
  cellValue: string
  cellFormula?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  formulaChange: [value: string]
  insertFunction: []
}>()

const inputRef = ref<HTMLInputElement>()
const inputValue = ref('')

const cellRef = computed(() => {
  if (!props.selectedCell) return 'A1'
  return coordsToCellRef(props.selectedCell.row, props.selectedCell.col)
})

// Sync with props only when not focused
watch(() => props.cellFormula || props.cellValue, (newValue) => {
  if (document.activeElement !== inputRef.value) {
    inputValue.value = newValue || ''
  }
}, { immediate: true })

const onInput = (e: Event) => {
  const value = (e.target as HTMLInputElement).value
  inputValue.value = value
  emit('formulaChange', value)
}

const onConfirm = () => {
  emit('formulaChange', inputValue.value)
}

// Focus input programmatically
defineExpose({
  focus: () => inputRef.value?.focus()
})
</script>
