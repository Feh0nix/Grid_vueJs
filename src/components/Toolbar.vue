<template>
  <div class="excel-toolbar-container">
    <!-- Top Menu Bar -->
    <div class="excel-menu-bar">
      <button class="excel-menu-btn" @click="showFileMenu = !showFileMenu">
        <span>Menus</span>
      </button>
    </div>

    <!-- Main Toolbar - Excel Style -->
    <nav class="excel-toolbar">
      <!-- Section 1: Undo/Redo/Print/Paint Format -->
      <div class="excel-tool-section">
        <button class="excel-btn" :disabled="!canUndo" @click="$emit('undo')" title="Annuler">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M9 14L4 9l5-5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M4 9h10a5 5 0 0 1 5 5v0a5 5 0 0 1-5 5H9" stroke-linecap="round"/>
          </svg>
        </button>
        <button class="excel-btn" :disabled="!canRedo" @click="$emit('redo')" title="Refaire">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M15 14l5-5-5-5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M20 9H10a5 5 0 0 0-5 5v0a5 5 0 0 0 5 5h6" stroke-linecap="round"/>
          </svg>
        </button>
        <button class="excel-btn" @click="$emit('print')" title="Imprimer">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M6 9V4h12v5" stroke-linecap="round"/>
            <rect x="6" y="14" width="12" height="7" rx="1"/>
            <path d="M6 11h12" stroke-linecap="round"/>
          </svg>
        </button>
        <button class="excel-btn" :class="{ active: paintFormatActive }" @click="$emit('paintFormat')" title="Reproduire la mise en forme">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M12 2l3 6 6 1-4 4 1 6-6-3-6 3 1-6-4-4 6-1z" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>

      <div class="excel-divider"></div>

      <!-- Section 2: Font Size & Format -->
      <div class="excel-tool-section">
        <select class="excel-select size-select" :value="currentFormat.fontSize || 10" @change="$emit('formatChange', { fontSize: Number(($event.target as HTMLSelectElement).value) })">
          <option value="8">8</option>
          <option value="9">9</option>
          <option value="10">10</option>
          <option value="11">11</option>
          <option value="12">12</option>
          <option value="14">14</option>
          <option value="16">16</option>
          <option value="18">18</option>
          <option value="20">20</option>
          <option value="24">24</option>
        </select>
        <button class="excel-btn" :class="{ active: currentFormat.bold }" @click="$emit('formatChange', { bold: !currentFormat.bold })" title="Gras">
          <span class="excel-icon-bold">B</span>
        </button>
        <button class="excel-btn" :class="{ active: currentFormat.italic }" @click="$emit('formatChange', { italic: !currentFormat.italic })" title="Italique">
          <span class="excel-icon-italic">I</span>
        </button>
        <button class="excel-btn" :class="{ active: currentFormat.underline }" @click="$emit('formatChange', { underline: !currentFormat.underline })" title="Souligné">
          <span class="excel-icon-underline">U</span>
        </button>
        <button class="excel-btn" :class="{ active: currentFormat.strikethrough }" @click="$emit('formatChange', { strikethrough: !currentFormat.strikethrough })" title="Barré">
          <span class="excel-icon-strikethrough">S</span>
        </button>
      </div>

      <div class="excel-divider"></div>

      <!-- Section 3: Borders & Fill -->
      <div class="excel-tool-section">
        <!-- Borders Dropdown -->
        <div class="excel-dropdown-wrapper">
          <button class="excel-btn excel-dropdown-btn" @click="showBordersMenu = !showBordersMenu" title="Bordures">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="3" y="3" width="18" height="18" rx="1"/>
              <path d="M3 9h18M9 3v18"/>
            </svg>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style="margin-left: -2px;">
              <path d="M7 10l5 5 5-5z"/>
            </svg>
          </button>
          <div v-if="showBordersMenu" class="excel-dropdown-menu">
            <div class="excel-dropdown-item" @click="$emit('borders', 'all'); showBordersMenu = false">
              <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
                <rect x="4" y="4" width="16" height="16"/>
                <path d="M4 12h16M12 4v16"/>
              </svg>
              <span>Toutes les bordures</span>
            </div>
            <div class="excel-dropdown-item" @click="$emit('borders', 'outside'); showBordersMenu = false">
              <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
                <rect x="4" y="4" width="16" height="16"/>
              </svg>
              <span>Bordure extérieure</span>
            </div>
            <div class="excel-dropdown-item" @click="$emit('borders', 'none'); showBordersMenu = false">
              <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
                <rect x="4" y="4" width="16" height="16" stroke-dasharray="2"/>
              </svg>
              <span>Aucune bordure</span>
            </div>
          </div>
        </div>

        <!-- Fill Color -->
        <div class="excel-color-btn" title="Couleur de remplissage">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M19 11l-8-8-9 9v6l6-6 3 3 5-5z"/>
            <path d="M17 13l-4 4" stroke-linecap="round"/>
          </svg>
          <div class="color-bar" :style="{ backgroundColor: currentFormat.backgroundColor || 'transparent' }"></div>
          <input type="color" :value="currentFormat.backgroundColor || '#ffffff'" @change="$emit('formatChange', { backgroundColor: ($event.target as HTMLInputElement).value })">
        </div>

        <!-- Font Color -->
        <div class="excel-color-btn" title="Couleur de police">
          <span class="excel-icon-font" :style="{ color: currentFormat.color || '#000' }">A</span>
          <div class="color-bar" :style="{ backgroundColor: currentFormat.color || '#000' }"></div>
          <input type="color" :value="currentFormat.color || '#000000'" @change="$emit('formatChange', { color: ($event.target as HTMLInputElement).value })">
        </div>
      </div>

      <div class="excel-divider"></div>

      <!-- Section 4: Alignment -->
      <div class="excel-tool-section">
        <button class="excel-btn" :class="{ active: currentFormat.align === 'left' || !currentFormat.align }" @click="$emit('formatChange', { align: 'left' })" title="Aligner à gauche">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <rect x="3" y="5" width="12" height="2"/>
            <rect x="3" y="11" width="16" height="2"/>
            <rect x="3" y="17" width="10" height="2"/>
          </svg>
        </button>
        <button class="excel-btn" :class="{ active: currentFormat.align === 'center' }" @click="$emit('formatChange', { align: 'center' })" title="Centrer">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="5" width="12" height="2"/>
            <rect x="4" y="11" width="16" height="2"/>
            <rect x="7" y="17" width="10" height="2"/>
          </svg>
        </button>
        <button class="excel-btn" :class="{ active: currentFormat.align === 'right' }" @click="$emit('formatChange', { align: 'right' })" title="Aligner à droite">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <rect x="9" y="5" width="12" height="2"/>
            <rect x="5" y="11" width="16" height="2"/>
            <rect x="11" y="17" width="10" height="2"/>
          </svg>
        </button>
        <button class="excel-btn" :class="{ active: currentFormat.verticalAlign === 'middle' }" @click="$emit('formatChange', { verticalAlign: 'middle' })" title="Justifier">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <rect x="3" y="5" width="18" height="2"/>
            <rect x="3" y="11" width="18" height="2"/>
            <rect x="3" y="17" width="18" height="2"/>
          </svg>
        </button>
        <button class="excel-btn" :class="{ active: currentFormat.textwrap }" @click="$emit('textwrap')" title="Renvoyer à la ligne automatiquement">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="4" width="18" height="16" rx="2"/>
            <path d="M7 9h10M7 13h7M7 17h4" stroke-linecap="round"/>
          </svg>
        </button>
        <button class="excel-btn" :class="{ active: isMergeActive }" @click="$emit('mergeCells')" title="Fusionner et centrer">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="6" width="18" height="12" rx="1"/>
            <path d="M12 6v12M8 10h8M8 14h8" stroke-linecap="round"/>
          </svg>
        </button>
      </div>

      <div class="excel-divider"></div>

      <!-- Section 5: Number Format -->
      <div class="excel-tool-section">
        <button class="excel-btn excel-currency-btn" @click="$emit('currencyFormat')" title="Format monétaire">
          <span>€</span>
        </button>
        <button class="excel-btn" @click="$emit('percentageFormat')" title="Format pourcentage">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 5L5 19M9 7a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM21 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"/>
          </svg>
        </button>
        <button class="excel-btn" @click="$emit('numberFormat')" title="Format nombre">
          <span style="font-size: 12px; font-weight: 600;">.0</span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style="margin-left: 2px;">
            <path d="M7 10l5 5 5-5z"/>
          </svg>
        </button>
      </div>

      <div class="excel-divider"></div>

      <!-- Section 6: Insert & Functions -->
      <div class="excel-tool-section">
        <div class="excel-dropdown-wrapper">
          <button class="excel-btn excel-dropdown-btn" @click="showInsertMenu = !showInsertMenu" title="Insérer">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <path d="M12 8v8M8 12h8" stroke-linecap="round"/>
            </svg>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style="margin-left: -2px;">
              <path d="M7 10l5 5 5-5z"/>
            </svg>
          </button>
          <div v-if="showInsertMenu" class="excel-dropdown-menu">
            <div class="excel-dropdown-item" @click="$emit('insertFunction'); showInsertMenu = false">
              <span>fx Fonction</span>
            </div>
            <div class="excel-dropdown-item" @click="$emit('insertChart'); showInsertMenu = false">
              <span>Graphique</span>
            </div>
            <div class="excel-dropdown-item" @click="$emit('insertImage'); showInsertMenu = false">
              <span>Image</span>
            </div>
            <div class="excel-dropdown-item" @click="$emit('insertLink'); showInsertMenu = false">
              <span>Lien</span>
            </div>
            <div class="excel-dropdown-item" @click="$emit('insertComment'); showInsertMenu = false">
              <span>Commentaire</span>
            </div>
          </div>
        </div>

        <div class="excel-dropdown-wrapper">
          <button class="excel-btn excel-dropdown-btn" @click="showFunctionsMenu = !showFunctionsMenu" title="Fonctions">
            <span style="font-size: 11px; font-weight: 600; font-style: italic;">∑</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style="margin-left: 2px;">
              <path d="M7 10l5 5 5-5z"/>
            </svg>
          </button>
          <div v-if="showFunctionsMenu" class="excel-dropdown-menu">
            <div class="excel-dropdown-item" @click="$emit('formulaHelp'); showFunctionsMenu = false">
              <span>Aide formules</span>
            </div>
            <div class="excel-dropdown-item" @click="$emit('insertFunction', 'SUM'); showFunctionsMenu = false">
              <span>SOMME</span>
            </div>
            <div class="excel-dropdown-item" @click="$emit('insertFunction', 'AVERAGE'); showFunctionsMenu = false">
              <span>MOYENNE</span>
            </div>
            <div class="excel-dropdown-item" @click="$emit('insertFunction', 'MAX'); showFunctionsMenu = false">
              <span>MAX</span>
            </div>
            <div class="excel-dropdown-item" @click="$emit('insertFunction', 'MIN'); showFunctionsMenu = false">
              <span>MIN</span>
            </div>
          </div>
        </div>
      </div>

      <div class="excel-divider"></div>

      <!-- Section 7: Sort & Filter -->
      <div class="excel-tool-section">
        <button class="excel-btn" @click="$emit('sortAsc')" title="Trier de A à Z">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M11 5h6M11 9h4M11 13h2" stroke-linecap="round"/>
            <path d="M3 7l4-4 4 4M7 3v14" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <button class="excel-btn" @click="$emit('sortDesc')" title="Trier de Z à A">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M11 19h6M11 15h4M11 11h2" stroke-linecap="round"/>
            <path d="M3 17l4 4 4-4M7 21V7" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <button class="excel-btn" @click="$emit('autofilter')" title="Filtrer">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <polygon points="3 4 21 4 14 12 14 20 10 20 10 12 3 4"/>
          </svg>
        </button>
      </div>

      <div class="excel-divider"></div>

      <!-- Section 8: More Tools -->
      <div class="excel-tool-section">
        <button class="excel-btn" @click="$emit('freeze')" title="Figer volets">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="3" width="18" height="18" rx="1"/>
            <path d="M9 3v18M3 9h18" stroke-linecap="round"/>
          </svg>
        </button>
        <button class="excel-btn" @click="$emit('clearFormat')" title="Effacer la mise en forme">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M3 7h18M5 7l2 14h10l2-14" stroke-linecap="round"/>
            <path d="M9 7V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v3" stroke-linecap="round"/>
          </svg>
        </button>
        <button class="excel-btn" @click="showMore = !showMore" title="Plus d'options">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="2"/>
            <circle cx="12" cy="12" r="2"/>
            <circle cx="12" cy="19" r="2"/>
          </svg>
        </button>
      </div>
    </nav>

    <!-- More Options Dropdown -->
    <div v-if="showMore" class="excel-dropdown excel-dropdown-more">
      <div class="excel-dropdown-item" @click="$emit('exportCSV'); showMore = false">
        <span>Exporter CSV</span>
      </div>
      <div class="excel-dropdown-item" @click="$emit('exportXLSX'); showMore = false">
        <span>Exporter XLSX</span>
      </div>
      <div class="excel-dropdown-item" @click="$emit('importCSV'); showMore = false">
        <span>Importer CSV</span>
      </div>
      <div class="excel-dropdown-item" @click="$emit('importXLSX'); showMore = false">
        <span>Importer XLSX</span>
      </div>
      <div class="excel-dropdown-divider"></div>
      <div class="excel-dropdown-item" @click="$emit('share'); showMore = false">
        <span>Partager</span>
      </div>
    </div>

    <!-- File Menu -->
    <div v-if="showFileMenu" class="excel-file-menu">
      <div class="excel-menu-header">
        <span>Fichier</span>
      </div>
      <div class="excel-dropdown-item" @click="$emit('exportCSV'); showFileMenu = false">
        <span>Télécharger au format CSV</span>
      </div>
      <div class="excel-dropdown-item" @click="$emit('exportXLSX'); showFileMenu = false">
        <span>Télécharger au format XLSX</span>
      </div>
      <div class="excel-dropdown-divider"></div>
      <div class="excel-dropdown-item" @click="$emit('importCSV'); showFileMenu = false">
        <span>Importer CSV</span>
      </div>
      <div class="excel-dropdown-item" @click="$emit('importXLSX'); showFileMenu = false">
        <span>Importer XLSX</span>
      </div>
      <div class="excel-dropdown-divider"></div>
      <div class="excel-dropdown-item" @click="$emit('print'); showFileMenu = false">
        <span>Imprimer</span>
      </div>
      <div class="excel-dropdown-divider"></div>
      <div class="excel-dropdown-item" @click="$emit('share'); showFileMenu = false">
        <span>Partager</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { CellFormat } from '../types/spreadsheet'

interface Props {
  spreadsheetName: string
  currentFormat: CellFormat
  canUndo: boolean
  canRedo: boolean
  zoom: number
  isFavorite: boolean
  isMergeActive: boolean
  paintFormatActive: boolean
}

defineProps<Props>()

defineEmits<{
  undo: []
  redo: []
  print: []
  paintFormat: []
  clearFormat: []
  zoomChange: [zoom: number]
  currencyFormat: []
  percentageFormat: []
  numberFormat: []
  formatChange: [format: Partial<CellFormat>]
  mergeCells: []
  borders: [type?: string]
  freeze: []
  autofilter: []
  textwrap: []
  share: []
  toggleFavorite: []
  formulaHelp: []
  exportCSV: []
  exportXLSX: []
  importCSV: []
  importXLSX: []
  sortAsc: []
  sortDesc: []
  insertFunction: [name?: string]
  insertChart: []
  insertImage: []
  insertLink: []
  insertComment: []
}>()

const showMore = ref(false)
const showFileMenu = ref(false)
const showBordersMenu = ref(false)
const showInsertMenu = ref(false)
const showFunctionsMenu = ref(false)
</script>

<style scoped>
/* Excel Toolbar Container */
.excel-toolbar-container {
  background: #f8f9fa;
  border-bottom: 1px solid #dadce0;
}

/* Menu Bar */
.excel-menu-bar {
  display: flex;
  align-items: center;
  padding: 4px 12px;
  background: white;
  border-bottom: 1px solid #e8eaed;
}

.excel-menu-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border: 1px solid #dadce0;
  border-radius: 4px;
  background: white;
  color: #5f6368;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.excel-menu-btn:hover {
  background: #f1f3f4;
  border-color: #1a73e8;
}

/* Main Toolbar */
.excel-toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: #f8f9fa;
  flex-wrap: wrap;
}

.excel-tool-section {
  display: flex;
  align-items: center;
  gap: 2px;
}

.excel-divider {
  width: 1px;
  height: 24px;
  background: #dadce0;
  margin: 0 4px;
}

/* Excel Buttons */
.excel-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: #5f6368;
  cursor: pointer;
  transition: all 0.15s ease;
}

.excel-btn:hover {
  background: #e8eaed;
  border-color: #dadce0;
  color: #202124;
}

.excel-btn:active {
  background: #dadce0;
}

.excel-btn.active {
  background: #e8f0fe;
  border-color: #1a73e8;
  color: #1a73e8;
}

.excel-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.excel-btn:disabled:hover {
  background: transparent;
  border-color: transparent;
}

/* Excel Dropdown Button */
.excel-dropdown-btn {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 0 4px;
}

/* Excel Icons */
.excel-icon-bold {
  font-weight: 700;
  font-size: 15px;
  color: inherit;
}

.excel-icon-italic {
  font-style: italic;
  font-size: 15px;
  font-weight: 600;
  color: inherit;
}

.excel-icon-underline {
  text-decoration: underline;
  font-size: 15px;
  font-weight: 600;
  color: inherit;
}

.excel-icon-strikethrough {
  text-decoration: line-through;
  font-size: 15px;
  font-weight: 600;
  color: inherit;
}

.excel-icon-font {
  font-size: 15px;
  font-weight: 700;
  font-family: 'Times New Roman', serif;
}

.excel-currency-btn {
  font-size: 16px;
  font-weight: 600;
}

/* Excel Select */
.excel-select {
  height: 32px;
  padding: 0 8px;
  border: 1px solid #dadce0;
  border-radius: 4px;
  background: white;
  font-size: 13px;
  cursor: pointer;
  outline: none;
  color: #202124;
  transition: all 0.15s ease;
}

.excel-select:hover {
  border-color: #1a73e8;
}

.excel-select:focus {
  border-color: #1a73e8;
  box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.1);
}

.size-select {
  width: 55px;
}

/* Color Buttons */
.excel-color-btn {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  transition: all 0.15s ease;
  gap: 2px;
}

.excel-color-btn:hover {
  background: #e8eaed;
  border-color: #dadce0;
}

.excel-color-btn input[type="color"] {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.color-bar {
  width: 16px;
  height: 3px;
  border-radius: 1px;
  border: 1px solid #dadce0;
}

/* Dropdown Wrapper */
.excel-dropdown-wrapper {
  position: relative;
}

.excel-dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  background: white;
  border: 1px solid #dadce0;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  min-width: 180px;
  padding: 4px 0;
}

.excel-dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 13px;
  color: #202124;
  transition: background 0.15s;
}

.excel-dropdown-item:hover {
  background: #f1f3f4;
}

.excel-dropdown-divider {
  height: 1px;
  background: #dadce0;
  margin: 4px 0;
}

/* More Dropdown */
.excel-dropdown-more {
  position: absolute;
  top: 100%;
  right: 12px;
  margin-top: 4px;
}

/* File Menu */
.excel-file-menu {
  position: absolute;
  top: 40px;
  left: 12px;
  background: white;
  border: 1px solid #dadce0;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1001;
  min-width: 220px;
  padding: 4px 0;
}

.excel-menu-header {
  padding: 8px 12px;
  font-size: 14px;
  font-weight: 600;
  color: #1a73e8;
  border-bottom: 1px solid #dadce0;
  margin-bottom: 4px;
}
</style>
