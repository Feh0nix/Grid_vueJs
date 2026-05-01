<template>
  <div v-if="show" class="filter-dropdown" :style="positionStyle" @click.stop>
    <div class="filter-header">
      <h4>{{ columnName }}</h4>
      <button class="close-btn" @click="$emit('close')">×</button>
    </div>
    <div class="filter-content">
      <div class="filter-search">
        <input
          type="text"
          v-model="searchText"
          placeholder="Rechercher..."
          class="search-input"
        />
      </div>
      <div class="filter-actions">
        <button class="filter-action-btn" @click="selectAll">Tout sélectionner</button>
        <button class="filter-action-btn" @click="deselectAll">Tout désélectionner</button>
      </div>
      <div class="filter-values">
        <label v-for="value in filteredValues" :key="value" class="filter-item">
          <input
            type="checkbox"
            v-model="selectedValues"
            :value="value"
          />
          <span>{{ value || '(Vide)' }}</span>
        </label>
      </div>
    </div>
    <div class="filter-footer">
      <button class="btn btn-secondary" @click="$emit('close')">Annuler</button>
      <button class="btn btn-primary" @click="applyFilter">OK</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface Props {
  show: boolean
  columnName: string
  values: string[]
  selected: string[]
  position: { top: number; left: number }
}

const props = defineProps<Props>()
const emit = defineEmits<{
  apply: [selected: string[]]
  close: []
}>()

const searchText = ref('')
const selectedValues = ref<string[]>([])

// Initialize selected values when opened
watch(() => props.show, (newVal) => {
  if (newVal) {
    selectedValues.value = [...props.selected]
    searchText.value = ''
  }
})

const positionStyle = computed(() => ({
  top: `${props.position.top}px`,
  left: `${props.position.left}px`
}))

const filteredValues = computed(() => {
  const uniqueValues = [...new Set(props.values)]
  if (!searchText.value) return uniqueValues
  return uniqueValues.filter(v =>
    v.toLowerCase().includes(searchText.value.toLowerCase())
  )
})

const selectAll = () => {
  selectedValues.value = [...filteredValues.value]
}

const deselectAll = () => {
  selectedValues.value = []
}

const applyFilter = () => {
  emit('apply', selectedValues.value)
  emit('close')
}
</script>

<style scoped>
.filter-dropdown {
  position: fixed;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  min-width: 200px;
  max-width: 300px;
  z-index: 1002;
}

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  border-bottom: 1px solid #eee;
}

.filter-header h4 {
  margin: 0;
  font-size: 14px;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #999;
}

.close-btn:hover {
  color: #333;
}

.filter-content {
  max-height: 300px;
  overflow-y: auto;
}

.filter-search {
  padding: 10px 15px;
  border-bottom: 1px solid #eee;
}

.search-input {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
}

.filter-actions {
  display: flex;
  gap: 5px;
  padding: 8px 15px;
  border-bottom: 1px solid #eee;
}

.filter-action-btn {
  flex: 1;
  padding: 4px 8px;
  font-size: 11px;
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 3px;
  cursor: pointer;
}

.filter-values {
  padding: 5px 0;
  max-height: 200px;
  overflow-y: auto;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 15px;
  cursor: pointer;
  font-size: 13px;
}

.filter-item:hover {
  background: #f5f5f5;
}

.filter-item input[type="checkbox"] {
  margin: 0;
}

.filter-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px 15px;
  border-top: 1px solid #eee;
}

.btn {
  padding: 6px 12px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-size: 13px;
}

.btn-secondary {
  background: #f5f5f5;
  border: 1px solid #ddd;
}

.btn-primary {
  background: #4b89ff;
  color: white;
}
</style>
