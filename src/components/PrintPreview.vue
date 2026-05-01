<template>
  <div v-if="show" class="print-preview-overlay" @click.self="close">
    <div class="print-preview-container">
      <div class="print-header">
        <h3>Aperçu avant impression</h3>
        <div class="print-actions">
          <button class="btn-secondary" @click="close">
            <Icons name="close" /> Fermer
          </button>
          <button class="btn-primary" @click="print">
            <Icons name="print" /> Imprimer
          </button>
        </div>
      </div>
      
      <div class="print-settings">
        <div class="setting-group">
          <label>Orientation :</label>
          <select v-model="settings.orientation" class="form-select">
            <option value="portrait">Portrait</option>
            <option value="landscape">Paysage</option>
          </select>
        </div>
        <div class="setting-group">
          <label>Mise à l'échelle :</label>
          <select v-model="settings.scale" class="form-select">
            <option value="100">100%</option>
            <option value="fit">Ajuster à la page</option>
            <option value="custom">Personnalisé</option>
          </select>
        </div>
        <div class="setting-group" v-if="settings.scale === 'custom'">
          <label>% :</label>
          <input v-model.number="settings.scaleValue" type="number" min="10" max="400" class="form-input">
        </div>
        <div class="setting-group">
          <label>Marges :</label>
          <select v-model="settings.margins" class="form-select">
            <option value="normal">Normales</option>
            <option value="narrow">Étroites</option>
            <option value="wide">Larges</option>
          </select>
        </div>
        <div class="setting-group checkbox">
          <label class="checkbox-label">
            <input type="checkbox" v-model="settings.showGridLines">
            <span>Lignes de grille</span>
          </label>
        </div>
        <div class="setting-group checkbox">
          <label class="checkbox-label">
            <input type="checkbox" v-model="settings.showHeaders">
            <span>En-têtes de lignes/colonnes</span>
          </label>
        </div>
      </div>
      
      <div class="print-preview-area">
        <div 
          class="preview-page"
          :class="[`orientation-${settings.orientation}`, `margins-${settings.margins}`]"
          :style="previewStyle"
        >
          <div class="page-header">
            <span v-if="spreadsheetName">{{ spreadsheetName }}</span>
            <span>Page {{ currentPage }} sur {{ safeTotalPages }}</span>
          </div>
          <div class="page-content">
            <slot :settings="settings" />
          </div>
          <div class="page-footer">
            <span>{{ new Date().toLocaleDateString('fr-FR') }}</span>
          </div>
        </div>
        
        <div v-if="safeTotalPages > 1" class="page-navigation">
          <button class="nav-btn" :disabled="currentPage <= 1" @click="currentPage--">&lt;</button>
          <span>Page {{ currentPage }} / {{ safeTotalPages }}</span>
          <button class="nav-btn" :disabled="currentPage >= safeTotalPages" @click="currentPage++">&gt;</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import Icons from './Icons.vue'

interface PrintSettings {
  orientation: 'portrait' | 'landscape'
  scale: '100' | 'fit' | 'custom'
  scaleValue: number
  margins: 'normal' | 'narrow' | 'wide'
  showGridLines: boolean
  showHeaders: boolean
}

interface Props {
  show: boolean
  spreadsheetName?: string
  totalPages?: number
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'close': []
  'print': [settings: PrintSettings]
}>()

const currentPage = ref(1)

const safeTotalPages = computed(() => props.totalPages ?? 1)

const settings = ref<PrintSettings>({
  orientation: 'portrait',
  scale: '100',
  scaleValue: 100,
  margins: 'normal',
  showGridLines: true,
  showHeaders: true
})

const previewStyle = computed(() => {
  const scale = settings.value.scale === 'custom' 
    ? settings.value.scaleValue / 100 
    : settings.value.scale === 'fit' 
      ? 'auto'
      : 1
  
  return {
    transform: `scale(${scale})`,
    transformOrigin: 'top center'
  }
})

function close() {
  emit('close')
}

function print() {
  emit('print', settings.value)
}
</script>

<style scoped>
.print-preview-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.print-preview-container {
  background: #f5f5f5;
  border-radius: 8px;
  width: 90vw;
  height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.print-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: white;
  border-bottom: 1px solid #e0e0e0;
}

.print-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.print-actions {
  display: flex;
  gap: 12px;
}

.print-settings {
  display: flex;
  gap: 16px;
  padding: 12px 20px;
  background: #fafafa;
  border-bottom: 1px solid #e0e0e0;
  flex-wrap: wrap;
  align-items: center;
}

.setting-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.setting-group.checkbox {
  margin-left: auto;
}

.setting-group label {
  font-size: 12px;
  color: #666;
  white-space: nowrap;
}

.form-select,
.form-input {
  padding: 6px 10px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-size: 12px;
  background: white;
  min-width: 100px;
}

.form-input {
  width: 60px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 12px;
  color: #333;
}

.print-preview-area {
  flex: 1;
  overflow: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.preview-page {
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  padding: 40px;
  margin-bottom: 20px;
  min-height: 800px;
  width: 595pt; /* A4 width */
}

.preview-page.orientation-landscape {
  width: 842pt; /* A4 height */
  min-height: 595pt;
}

.preview-page.margins-narrow {
  padding: 20px;
}

.preview-page.margins-wide {
  padding: 60px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #666;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #f0f0f0;
}

.page-content {
  flex: 1;
}

.page-footer {
  text-align: center;
  font-size: 11px;
  color: #666;
  margin-top: 20px;
  padding-top: 10px;
  border-top: 1px solid #f0f0f0;
}

.page-navigation {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
}

.nav-btn {
  padding: 6px 12px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  color: #333;
}

.nav-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.nav-btn:hover:not(:disabled) {
  background: #f5f5f5;
}

.btn-secondary {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  color: #333;
}

.btn-secondary:hover {
  background: #f5f5f5;
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;
  background: #4b89ff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  color: white;
}

.btn-primary:hover {
  background: #3a78ee;
}

@media print {
  .print-preview-overlay {
    background: white;
    position: static;
  }
  
  .print-header,
  .print-settings,
  .page-navigation {
    display: none;
  }
  
  .print-preview-container {
    width: 100%;
    height: auto;
  }
  
  .print-preview-area {
    padding: 0;
  }
  
  .preview-page {
    box-shadow: none;
    width: 100%;
    transform: none !important;
  }
}
</style>
