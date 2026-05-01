<template>
  <div v-if="show" class="sortfilter-modal" @click.self="close">
    <div class="sortfilter-container" :style="positionStyle">
      <div class="sortfilter-header">
        <h3>Trier et filtrer</h3>
        <button class="close-btn" @click="close">×</button>
      </div>
      
      <div class="sortfilter-section">
        <h4>Trier</h4>
        <div class="sort-options">
          <label class="radio-label">
            <input type="radio" v-model="sortType" value="asc">
            <span>Croissant (A → Z)</span>
          </label>
          <label class="radio-label">
            <input type="radio" v-model="sortType" value="desc">
            <span>Décroissant (Z → A)</span>
          </label>
        </div>
        <button class="btn-action" @click="applySort">Appliquer le tri</button>
      </div>
      
      <div class="sortfilter-divider"></div>
      
      <div class="sortfilter-section">
        <h4>Filtrer</h4>
        <div class="filter-options">
          <label class="checkbox-label">
            <input type="checkbox" v-model="filterConfig.blank">
            <span>Exclure les cellules vides</span>
          </label>
          <label class="checkbox-label">
            <input type="checkbox" v-model="filterConfig.duplicates">
            <span>Afficher uniquement les doublons</span>
          </label>
        </div>
        <div class="filter-values">
          <p class="filter-subtitle">Valeurs uniques :</p>
          <div class="value-list">
            <label v-for="value in uniqueValues" :key="value" class="checkbox-label">
              <input type="checkbox" v-model="filterConfig.selectedValues" :value="value">
              <span>{{ value || '(Vide)' }}</span>
            </label>
          </div>
        </div>
        <button class="btn-action" @click="applyFilter">Appliquer le filtre</button>
      </div>
      
      <div class="sortfilter-footer">
        <button class="btn-text" @click="clearAll">Effacer tout</button>
        <button class="btn-primary" @click="close">Fermer</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface FilterConfig {
  blank: boolean
  duplicates: boolean
  selectedValues: string[]
}

interface Props {
  show: boolean
  position?: { left: number; top: number }
  columnData?: string[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'close': []
  'sort': [type: 'asc' | 'desc']
  'filter': [config: FilterConfig]
}>()

const sortType = ref<'asc' | 'desc'>('asc')
const filterConfig = ref<FilterConfig>({
  blank: false,
  duplicates: false,
  selectedValues: []
})

const positionStyle = computed(() => {
  if (props.position) {
    return {
      left: `${props.position.left}px`,
      top: `${props.position.top}px`
    }
  }
  return {}
})

const uniqueValues = computed(() => {
  if (!props.columnData) return []
  const unique = [...new Set(props.columnData)]
  return unique.sort()
})

function applySort() {
  emit('sort', sortType.value)
}

function applyFilter() {
  emit('filter', filterConfig.value)
}

function clearAll() {
  sortType.value = 'asc'
  filterConfig.value = {
    blank: false,
    duplicates: false,
    selectedValues: []
  }
  emit('filter', filterConfig.value)
}

function close() {
  emit('close')
}

watch(() => props.show, (newVal) => {
  if (newVal && props.columnData) {
    filterConfig.value.selectedValues = [...new Set(props.columnData)]
  }
})
</script>

<style scoped>
.sortfilter-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  background: transparent;
}

.sortfilter-container {
  position: absolute;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 16px;
  min-width: 250px;
  max-width: 300px;
}

.sortfilter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}

.sortfilter-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 18px;
  color: #999;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #333;
}

.sortfilter-section {
  margin-bottom: 16px;
}

.sortfilter-section h4 {
  margin: 0 0 12px 0;
  font-size: 12px;
  font-weight: 500;
  color: #666;
  text-transform: uppercase;
}

.sort-options,
.filter-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.radio-label,
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
  color: #333;
}

.radio-label input,
.checkbox-label input {
  cursor: pointer;
}

.sortfilter-divider {
  height: 1px;
  background: #f0f0f0;
  margin: 16px 0;
}

.filter-values {
  margin-bottom: 12px;
}

.filter-subtitle {
  margin: 0 0 8px 0;
  font-size: 12px;
  color: #666;
}

.value-list {
  max-height: 150px;
  overflow-y: auto;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.btn-action {
  width: 100%;
  padding: 8px;
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  color: #333;
  margin-top: 8px;
}

.btn-action:hover {
  background: #e8e8e8;
}

.sortfilter-footer {
  display: flex;
  justify-content: space-between;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.btn-text {
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px 12px;
  font-size: 12px;
  color: #666;
  border-radius: 4px;
}

.btn-text:hover {
  background: #f5f5f5;
}

.btn-primary {
  background: #4b89ff;
  border: none;
  cursor: pointer;
  padding: 6px 16px;
  font-size: 12px;
  color: white;
  border-radius: 4px;
}

.btn-primary:hover {
  background: #3a78ee;
}
</style>
