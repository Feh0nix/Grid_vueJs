<template>
  <div v-if="show" class="modal" @click="$emit('close')">
    <div class="modal-content border-selector-modal" @click.stop>
      <h2>Sélecteur de Bordures</h2>
      <div class="border-section">
        <h3>Position</h3>
        <div class="border-grid">
          <button class="border-grid-btn" :class="{ active: borders.top }" @click="toggleBorder('top')">─</button>
          <button class="border-grid-btn" :class="{ active: borders.right }" @click="toggleBorder('right')">│</button>
          <button class="border-grid-btn" :class="{ active: borders.bottom }" @click="toggleBorder('bottom')">─</button>
          <button class="border-grid-btn" :class="{ active: borders.left }" @click="toggleBorder('left')">│</button>
        </div>
        <div class="border-presets">
          <button class="preset-btn" @click="applyPreset('all')">Tout</button>
          <button class="preset-btn" @click="applyPreset('outside')">Extérieur</button>
          <button class="preset-btn" @click="applyPreset('none')">Aucune</button>
        </div>
      </div>
      <div class="border-section">
        <h3>Style</h3>
        <div class="style-options">
          <button v-for="style in borderStyles" :key="style.value" class="style-btn" :class="{ active: currentStyle === style.value }" @click="currentStyle = style.value">
            <div class="style-preview" :class="style.class"></div>
            <span>{{ style.label }}</span>
          </button>
        </div>
      </div>
      <div class="border-section">
        <h3>Couleur</h3>
        <input type="color" v-model="currentColor" class="color-input" />
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" @click="$emit('close')">Annuler</button>
        <button class="btn btn-primary" @click="applyBorders">Appliquer</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { CellBorder, BorderStyle } from '../types/spreadsheet'

interface Props { show: boolean; currentBorders?: CellBorder }
defineProps<Props>()
const emit = defineEmits<{ apply: [border: CellBorder]; close: [] }>()

const borderStyles: { value: BorderStyle['style']; label: string; class: string }[] = [
  { value: 'thin', label: 'Fin', class: 'style-thin' },
  { value: 'medium', label: 'Moyen', class: 'style-medium' },
  { value: 'thick', label: 'Épais', class: 'style-thick' },
  { value: 'dashed', label: 'Tirets', class: 'style-dashed' },
  { value: 'dotted', label: 'Pointillés', class: 'style-dotted' },
  { value: 'double', label: 'Double', class: 'style-double' }
]

const borders = ref({ top: false, right: false, bottom: false, left: false })
const currentStyle = ref<BorderStyle['style']>('thin')
const currentColor = ref('#000000')

const toggleBorder = (side: 'top' | 'right' | 'bottom' | 'left') => { borders.value[side] = !borders.value[side] }
const applyPreset = (preset: 'all' | 'outside' | 'none') => {
  if (preset === 'all' || preset === 'outside') borders.value = { top: true, right: true, bottom: true, left: true }
  else borders.value = { top: false, right: false, bottom: false, left: false }
}
const applyBorders = () => {
  const border: CellBorder = {}
  const style: BorderStyle = { style: currentStyle.value, color: currentColor.value }
  if (borders.value.top) border.top = style
  if (borders.value.right) border.right = style
  if (borders.value.bottom) border.bottom = style
  if (borders.value.left) border.left = style
  emit('apply', border)
  emit('close')
}
</script>

<style scoped>
.border-selector-modal { max-width: 500px; }
.border-section { margin-bottom: 20px; }
.border-section h3 { margin-bottom: 10px; font-size: 14px; color: #333; }
.border-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; margin-bottom: 10px; }
.border-grid-btn { padding: 10px; border: 1px solid #ddd; background: #fff; cursor: pointer; border-radius: 4px; }
.border-grid-btn.active { background: #4b89ff; color: white; border-color: #4b89ff; }
.border-presets { display: flex; gap: 5px; }
.preset-btn { padding: 5px 10px; border: 1px solid #ddd; background: #fff; cursor: pointer; border-radius: 4px; }
.style-options { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; }
.style-btn { display: flex; flex-direction: column; align-items: center; padding: 10px; border: 1px solid #ddd; background: #fff; cursor: pointer; border-radius: 4px; }
.style-btn.active { border-color: #4b89ff; background: #f0f7ff; }
.style-preview { width: 100%; height: 20px; margin-bottom: 5px; }
.style-thin { border-bottom: 1px solid #000; }
.style-medium { border-bottom: 2px solid #000; }
.style-thick { border-bottom: 4px solid #000; }
.style-dashed { border-bottom: 2px dashed #000; }
.style-dotted { border-bottom: 2px dotted #000; }
.style-double { border-bottom: 3px double #000; }
.color-input { width: 100%; height: 40px; cursor: pointer; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.btn { padding: 8px 16px; border-radius: 4px; cursor: pointer; border: none; }
.btn-secondary { background: #ddd; }
.btn-primary { background: #4b89ff; color: white; }
</style>
