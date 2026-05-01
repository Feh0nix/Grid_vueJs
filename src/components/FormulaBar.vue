<template>
  <div class="excel-formula-bar">
    <div class="excel-cell-ref">
      {{ cellRef }}
    </div>
    <button class="excel-fx-btn" title="Insérer une fonction" @click="$emit('insertFunction')">
      <span class="excel-fx-icon">fx</span>
    </button>
    <div class="excel-formula-input-wrapper">
      <input
        ref="inputRef"
        type="text"
        class="excel-formula-input"
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

<style scoped>
.excel-formula-bar {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 4px 8px;
  background: #f8f9fa;
  border-bottom: 1px solid #dadce0;
  height: 36px;
}

.excel-cell-ref {
  min-width: 60px;
  height: 28px;
  padding: 0 8px;
  background: white;
  border: 1px solid #dadce0;
  border-radius: 2px;
  font-family: 'Segoe UI', Arial, sans-serif;
  font-size: 13px;
  font-weight: 500;
  text-align: center;
  color: #202124;
  display: flex;
  align-items: center;
  justify-content: center;
}

.excel-fx-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: #1a73e8;
  cursor: pointer;
  margin-left: 4px;
  border-radius: 2px;
  transition: background 0.15s;
}

.excel-fx-btn:hover {
  background: #e8f0fe;
}

.excel-fx-icon {
  font-family: 'Times New Roman', serif;
  font-style: italic;
  font-size: 14px;
  font-weight: 600;
}

.excel-formula-input-wrapper {
  flex: 1;
  margin-left: 4px;
}

.excel-formula-input {
  width: 100%;
  height: 28px;
  padding: 0 8px;
  border: 1px solid #dadce0;
  border-radius: 2px;
  font-size: 13px;
  font-family: 'Segoe UI', Arial, sans-serif;
  background: white;
  outline: none;
  transition: border-color 0.15s;
  overflow: visible;
  white-space: nowrap;
}

.excel-formula-input:focus {
  border-color: #1a73e8;
  box-shadow: 0 0 0 1px rgba(26, 115, 232, 0.1);
}
</style>
