<template>
  <div class="spreadsheet-app">
    <!-- Header / Toolbar -->
    <Toolbar
      :spreadsheet-name="store.spreadsheet.value.name"
      :current-format="store.currentFormat.value"
      :can-undo="store.canUndo.value"
      :can-redo="store.canRedo.value"
      :zoom="store.spreadsheet.value.zoom"
      :is-favorite="store.isFavorite.value"
      :is-merge-active="store.isMergeActive.value"
      :paint-format-active="store.isPaintFormatActive()"
      @undo="store.undo"
      @redo="store.redo"
      @print="showPrintPreview = true"
      @paint-format="store.activatePaintFormat"
      @clear-format="handleClearFormat"
      @zoom-change="store.setZoom"
      @currency-format="handleCurrencyFormat"
      @percentage-format="handlePercentageFormat"
      @number-format="handleNumberFormat"
      @format-change="handleFormatChange"
      @merge-cells="store.mergeCells"
      @borders="handleBorders"
      @freeze="store.freezePanes"
      @autofilter="handleAutofilter"
      @textwrap="handleTextWrap"
      @share="handleShare"
      @toggle-favorite="store.toggleFavorite"
      @formula-help="store.showFormulaHelp.value = true"
      @export-csv="handleExportCSV"
      @export-xlsx="handleExportXLSX"
      @import-csv="handleImportCSV"
      @import-xlsx="handleImportXLSX"
      @sort-asc="handleSortAscending"
      @sort-desc="handleSortDescending"
      @insert-function="handleInsertFunction"
      @insert-chart="toastRef?.info('Graphique: fonctionnalité à venir')"
      @insert-image="toastRef?.info('Image: fonctionnalité à venir')"
      @insert-link="toastRef?.info('Lien: fonctionnalité à venir')"
      @insert-comment="toastRef?.info('Commentaire: fonctionnalité à venir')"
    />
    
    <!-- Formula Bar -->
    <FormulaBar
      :selected-cell="store.selectedCell.value"
      :cell-value="store.selectedCellData.value?.value || ''"
      :cell-formula="store.selectedCellData.value?.formula"
      @formula-change="handleFormulaChange"
      @insert-function="store.showFormulaHelp.value = true"
    />
    
    <!-- Grid Area -->
    <div class="grid-wrapper">
      <SpreadsheetGrid
        :sheet="store.activeSheet.value"
        :selected-cell="store.selectedCell.value"
        :selection-range="store.selectionRange.value"
        :editing-cell="store.editingCell.value"
        :zoom="store.spreadsheet.value.zoom"
        :show-grid="store.spreadsheet.value.showGrid"
        :is-paint-format-active="store.isPaintFormatActive()"
        :autofilter-range="store.autofilterRange.value"
        :hidden-rows="store.hiddenRows.value"
        @cell-select="store.selectCell"
        @cell-range-select="store.selectRange"
        @cell-edit="store.startEdit"
        @cell-value-change="handleCellValueChange"
        @cell-edit-end="store.endEdit"
        @cell-format-change="store.updateCellFormat"
        @paint-format-apply="store.applyPaintFormat"
        @row-resize="store.resizeRow"
        @col-resize="store.resizeCol"
        @filter-click="handleFilterClick"
      />
    </div>
    
    <!-- Sheet Tabs -->
    <SheetTabs
      :sheets="store.spreadsheet.value.sheets"
      :active-sheet-id="store.spreadsheet.value.activeSheetId"
      @sheet-change="store.setActiveSheet"
      @add-sheet="store.addSheet"
      @delete-sheet="store.deleteSheet"
    />
    
    <!-- Context Menu -->
    <ContextMenu
      :show="contextMenu.show"
      :position="contextMenu.position"
      @cut="handleCut"
      @copy="handleCopy"
      @paste="handlePaste"
      @merge="store.mergeCells"
      @unmerge="store.unmergeCells"
      @insert-row="store.insertRow"
      @insert-col="store.insertCol"
      @delete-row="store.deleteRow"
      @delete-col="store.deleteCol"
      @hide-row="store.hideRow"
      @hide-col="store.hideCol"
      @show-all="store.showAllRows"
      @format-cells="store.showFormatModal.value = true"
      @validation="store.showValidationModal.value = true"
      @sort-asc="handleSortAscending"
      @sort-desc="handleSortDescending"
      @click.stop
    />
    
    <!-- Formula Help Modal -->
    <FormulaHelpModal
      :show="store.showFormulaHelp.value"
      @close="store.showFormulaHelp.value = false"
    />
  </div>
  
  <!-- Modals -->
  <BorderSelector
    :show="showBorderSelector"
    @apply="store.applyBorder"
    @close="showBorderSelector = false"
  />

  <FilterDropdown
    :show="showFilterDropdown"
    :column-name="filterColumnName"
    :values="filterColumnValues"
    :selected="filterSelectedValues"
    :position="filterDropdownPosition"
    @apply="handleApplyFilter"
    @close="showFilterDropdown = false"
  />

  <PrintPreview
    :show="showPrintPreview"
    :spreadsheet-name="store.spreadsheet.value.name"
    @close="showPrintPreview = false"
    @print="handlePrint"
  />

  <!-- Toast -->
  <Toast ref="toastRef" />
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, onUnmounted } from 'vue'
import type { CellPosition, CellFormat } from './types/spreadsheet'
import { indexToColumn, cellKey } from './utils/helpers'
import { useSpreadsheetStore } from './stores'
import { 
  exportToCSV, 
  exportToXLSX, 
  importFromCSV, 
  importFromXLSX,
  createFileInput 
} from './composables/useImportExport'

// Components
import Toolbar from './components/Toolbar.vue'
import FormulaBar from './components/FormulaBar.vue'
import SheetTabs from './components/SheetTabs.vue'
import SpreadsheetGrid from './components/SpreadsheetGrid.vue'
import ContextMenu from './components/ContextMenu.vue'
import BorderSelector from './components/BorderSelector.vue'
import FilterDropdown from './components/FilterDropdown.vue'
import PrintPreview from './components/PrintPreview.vue'
import FormulaHelpModal from './components/FormulaHelpModal.vue'
import Toast from './components/Toast.vue'

// ============================================================================
// STORE INITIALIZATION
// ============================================================================

const store = useSpreadsheetStore()
const toastRef = ref<InstanceType<typeof Toast> | null>(null)

// ============================================================================
// UI STATE (hors store)
// ============================================================================

const contextMenu = reactive({
  show: false,
  position: { x: 0, y: 0 }
})

const showBorderSelector = ref(false)
const showPrintPreview = ref(false)
const showFilterDropdown = ref(false)
const filterColumnIndex = ref(0)
const filterColumnValues = ref<string[]>([])
const filterSelectedValues = ref<string[]>([])
const filterDropdownPosition = ref({ top: 0, left: 0 })

// ============================================================================
// COMPUTED HELPERS
// ============================================================================

const filterColumnName = computed(() => indexToColumn(filterColumnIndex.value))

// ============================================================================
// HANDLERS - EVENT BRIDGE
// ============================================================================

function handleFormatChange(format: Partial<CellFormat>) {
  const positions = getSelectedPositions()
  store.updateCellFormat(positions, format)
}

function handleFormulaChange(value: string) {
  if (!store.selectedCell.value) return
  store.updateCellValue(store.selectedCell.value, value)
}

function handleCellValueChange(position: CellPosition, value: string) {
  store.updateCellValue(position, value)
}

function handleCut() {
  store.cut()
  contextMenu.show = false
  toastRef.value?.info('Cellules coupées')
}

function handleCopy() {
  store.copy()
  contextMenu.show = false
  toastRef.value?.info('Cellules copiées')
}

function handlePaste() {
  store.paste()
  contextMenu.show = false
  toastRef.value?.success('Cellules collées')
}

function handleFilterClick(col: number, position: { top: number; left: number }) {
  if (!store.autofilterRange.value) return

  const values: string[] = []
  const { sri, eri } = store.autofilterRange.value

  for (let row = sri; row <= eri; row++) {
    const key = cellKey(row, col)
    const cell = store.activeSheet.value.cells.get(key)
    values.push(cell?.value || '')
  }

  filterColumnIndex.value = col
  filterColumnValues.value = values
  filterSelectedValues.value = store.activeFilters.value.get(col) || [...new Set(values)]
  filterDropdownPosition.value = position
  showFilterDropdown.value = true
}

function handleApplyFilter(selectedValues: string[]) {
  store.applyFilter(filterColumnIndex.value, selectedValues)
}

function handleShare() {
  navigator.clipboard.writeText(window.location.href)
  toastRef.value?.success('Lien copié dans le presse-papiers !')
}

function handlePrint() {
  window.print()
  toastRef.value?.info('Impression en cours...')
}

function handleBorders(type: string = 'all') {
  const positions = getSelectedPositions()
  const borders: Record<string, { top?: boolean; bottom?: boolean; left?: boolean; right?: boolean }> = {}
  
  for (const pos of positions) {
    if (type === 'all') {
      borders[cellKey(pos.row, pos.col)] = { top: true, bottom: true, left: true, right: true }
    } else if (type === 'outside') {
      // Simplified - just apply to all selected
      borders[cellKey(pos.row, pos.col)] = { top: true, bottom: true, left: true, right: true }
    } else if (type === 'none') {
      borders[cellKey(pos.row, pos.col)] = {}
    }
  }
  
  store.applyBorder(borders)
}

function handleInsertFunction(name?: string) {
  if (name && store.selectedCell.value) {
    store.updateCellValue(store.selectedCell.value, `=${name}()`)
    toastRef.value?.success(`Fonction ${name} insérée`)
  } else {
    store.showFormulaHelp.value = true
  }
}

function handleCurrencyFormat() {
  if (!store.selectionRange.value && !store.selectedCell.value) {
    toastRef.value?.info('Sélectionnez une cellule d\'abord')
    return
  }
  store.applyCurrencyFormat()
  toastRef.value?.success('Format € appliqué')
}

function handlePercentageFormat() {
  if (!store.selectionRange.value && !store.selectedCell.value) {
    toastRef.value?.info('Sélectionnez une cellule d\'abord')
    return
  }
  store.applyPercentageFormat()
  toastRef.value?.success('Format % appliqué')
}

function handleNumberFormat() {
  if (!store.selectionRange.value && !store.selectedCell.value) {
    toastRef.value?.info('Sélectionnez une cellule d\'abord')
    return
  }
  store.applyNumberFormat()
  toastRef.value?.success('Format nombre appliqué')
}

function handleSortAscending() {
  if (!store.selectionRange.value && !store.selectedCell.value) {
    toastRef.value?.info('Sélectionnez une colonne d\'abord')
    return
  }
  store.sortAscending()
  toastRef.value?.success('Tri A-Z effectué')
}

function handleSortDescending() {
  if (!store.selectionRange.value && !store.selectedCell.value) {
    toastRef.value?.info('Sélectionnez une colonne d\'abord')
    return
  }
  store.sortDescending()
  toastRef.value?.success('Tri Z-A effectué')
}

function handleClearFormat() {
  if (!store.selectionRange.value && !store.selectedCell.value) {
    toastRef.value?.info('Sélectionnez une cellule d\'abord')
    return
  }
  store.clearFormat()
  toastRef.value?.success('Mise en forme effacée')
}

function handleAutofilter() {
  store.toggleAutofilter()
  toastRef.value?.success('Filtre auto activé/désactivé')
}

function handleTextWrap() {
  if (!store.selectionRange.value && !store.selectedCell.value) {
    toastRef.value?.info('Sélectionnez une cellule d\'abord')
    return
  }
  store.toggleTextWrap()
  toastRef.value?.success('Retour à la ligne activé/désactivé')
}

// ============================================================================
// IMPORT/EXPORT
// ============================================================================

function handleExportCSV() {
  exportToCSV(store.activeSheet.value.cells, `${store.spreadsheet.value.name}.csv`)
  toastRef.value?.success('Export CSV réussi')
}

function handleExportXLSX() {
  exportToXLSX(store.activeSheet.value.cells, `${store.spreadsheet.value.name}.xlsx`)
  toastRef.value?.success('Export XLSX réussi')
}

function handleImportCSV() {
  createFileInput('.csv', async (file) => {
    try {
      const cells = await importFromCSV(file)
      store.saveState('Import CSV')
      store.activeSheet.value.cells = cells
      toastRef.value?.success('Import CSV réussi')
    } catch (error) {
      toastRef.value?.error('Erreur lors de l\'importation CSV')
    }
  })
}

function handleImportXLSX() {
  createFileInput('.xlsx,.xls', async (file) => {
    try {
      const cells = await importFromXLSX(file)
      store.saveState('Import XLSX')
      store.activeSheet.value.cells = cells
      toastRef.value?.success('Import XLSX réussi')
    } catch (error) {
      toastRef.value?.error('Erreur lors de l\'importation XLSX')
    }
  })
}

// ============================================================================
// UTILS
// ============================================================================

function getSelectedPositions(): CellPosition[] {
  const positions: CellPosition[] = []
  if (store.selectionRange.value) {
    for (const pos of iterateRange(store.selectionRange.value)) {
      positions.push(pos)
    }
  } else if (store.selectedCell.value) {
    positions.push(store.selectedCell.value)
  }
  return positions
}

function* iterateRange(range: { sri: number; sci: number; eri: number; eci: number }) {
  for (let row = range.sri; row <= range.eri; row++) {
    for (let col = range.sci; col <= range.eci; col++) {
      yield { row, col }
    }
  }
}

// ============================================================================
// KEYBOARD & EVENT HANDLERS
// ============================================================================

function handleGlobalKeyDown(e: KeyboardEvent) {
  if (e.ctrlKey || e.metaKey) {
    switch (e.key.toLowerCase()) {
      case 'z':
        e.preventDefault()
        if (e.shiftKey) {
          store.redo()
        } else {
          store.undo()
        }
        break
      case 'c':
        if (store.selectionRange.value) {
          store.copy()
          toastRef.value?.info('Cellules copiées')
        }
        break
      case 'x':
        if (store.selectionRange.value) {
          store.cut()
          toastRef.value?.info('Cellules coupées')
        }
        break
      case 'v':
        if (store.selectedCell.value) {
          store.paste()
          toastRef.value?.success('Cellules collées')
        }
        break
      case 'p':
        e.preventDefault()
        showPrintPreview.value = true
        break
      case 's':
        e.preventDefault()
        toastRef.value?.info('Sauvegarde simulée')
        break
    }
  }
}

function handleContextMenu(e: MouseEvent) {
  e.preventDefault()
  contextMenu.position = { x: e.clientX, y: e.clientY }
  contextMenu.show = true
}

function handleClickOutside() {
  contextMenu.show = false
}

// ============================================================================
// LIFECYCLE
// ============================================================================

onMounted(() => {
  document.addEventListener('keydown', handleGlobalKeyDown)
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('contextmenu', handleContextMenu)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleGlobalKeyDown)
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('contextmenu', handleContextMenu)
})
</script>


<style>
@import './styles/spreadsheet.css';

.spreadsheet-app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.grid-wrapper {
  flex: 1;
  overflow: hidden;
  position: relative;
}

/* Modal Styles */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1001;
}

.modal-content {
  background: white;
  padding: 24px;
  border-radius: 8px;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0,0,0,0.2);
}

.modal-content h2 {
  margin-bottom: 16px;
  color: #333;
}

.formula-list {
  margin-bottom: 20px;
}

.formula-category {
  margin-bottom: 20px;
}

.formula-category h3 {
  margin-bottom: 12px;
  color: #1a73e8;
  font-size: 16px;
}

.formula-category p {
  margin-bottom: 6px;
  font-size: 14px;
  line-height: 1.5;
}

.formula-category strong {
  color: #333;
}

/* Print Styles */
.print-content {
  padding: 20px;
}

.print-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.print-table th,
.print-table td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
}

.print-table th {
  background-color: #f5f5f5;
  font-weight: bold;
}
</style>
