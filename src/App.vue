<template>
  <div class="spreadsheet-app">
    <!-- Header / Toolbar -->
    <Toolbar
      :spreadsheet-name="spreadsheetName"
      :save-error="store.saveError"
      :current-format="currentFormat"
      :can-undo="canUndo"
      :can-redo="canRedo"
      :zoom="zoom"
      :is-favorite="isFavorite"
      :is-merge-active="isMergeActive"
      :paint-format-active="store.isPaintFormatActive()"
      @undo="store.undo"
      @rename="store.setSpreadsheetName"
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
      @freeze="handleFreeze"
      @autofilter="handleAutofilter"
      @textwrap="handleTextWrap"
      @share="handleShare"
      @validation="store.showValidationModal = true"
      @conditional-format="showConditionalFormat = true"
      @toggle-favorite="store.toggleFavorite"
      @formula-help="store.showFormulaHelp = true"
      @export-csv="handleExportCSV"
      @export-xlsx="handleExportXLSX"
      @import-csv="handleImportCSV"
      @import-xlsx="handleImportXLSX"
      @sort-asc="handleSortAscending"
      @sort-desc="handleSortDescending"
      @insert-function="handleInsertFunction"
      @insert-chart="handleInsertChart"
      @insert-image="toastRef?.info('Image: fonctionnalité à venir')"
      @insert-link="toastRef?.info('Lien: fonctionnalité à venir')"
      @insert-comment="toastRef?.info('Commentaire: fonctionnalité à venir')"
    />
    
    <!-- Formula Bar -->
    <FormulaBar
      :selected-cell="selectedCell"
      :cell-value="selectedCellData?.value || ''"
      :cell-formula="selectedCellData?.formula"
      @formula-change="handleFormulaChange"
      @insert-function="store.showFormulaHelp = true"
    />

    <div v-if="findOpen" class="find-bar" role="search" aria-label="Rechercher dans la feuille">
      <input ref="findInput" v-model="findQuery" aria-label="Rechercher" placeholder="Rechercher dans la feuille" @keydown.enter.prevent="findMatch($event.shiftKey ? -1 : 1)" @keydown.escape.prevent="findOpen = false" />
      <span aria-live="polite">{{ findMatches.length }} résultat{{ findMatches.length === 1 ? '' : 's' }}</span>
      <button type="button" aria-label="Résultat précédent" @click="findMatch(-1)">↑</button>
      <button type="button" aria-label="Résultat suivant" @click="findMatch(1)">↓</button>
      <button type="button" aria-label="Fermer la recherche" @click="findOpen = false">×</button>
    </div>
    
    <!-- Grid Area -->
    <div class="grid-wrapper">
      <SpreadsheetGrid
        :sheet="activeSheet"
        :selected-cell="selectedCell"
        :selection-range="selectionRange"
        :editing-cell="editingCell"
        :zoom="zoom"
        :show-grid="showGrid"
        :is-paint-format-active="store.isPaintFormatActive()"
        :autofilter-range="autofilterRange"
        :hidden-rows="hiddenRows"
        @cell-select="store.selectCell"
        @cell-range-select="store.selectRange"
        @cell-edit="store.startEdit"
        @cell-value-change="handleCellValueChange"
        @clear-selection="store.clearSelectionContents"
        @autofill="store.autofill"
        @cell-edit-end="store.endEdit"
        @cell-format-change="store.updateCellFormat"
        @paint-format-apply="store.applyPaintFormat"
        @row-resize="store.resizeRow"
        @col-resize="store.resizeCol"
        @filter-click="handleFilterClick"
      />
      <ChartPanel v-if="showCharts && charts.length" :charts="charts" :chart="selectedChart" :cells="store.sheetsData[spreadsheet.activeSheetId] || {}" :context="store.formulaContext" @close="showCharts = false" @select="selectedChartId = $event" @update="store.updateChart" @remove="store.removeChart" />
    </div>
    
    <!-- Sheet Tabs -->
    <SheetTabs
      :sheets="spreadsheet.sheets"
      :active-sheet-id="spreadsheet.activeSheetId"
      @sheet-change="store.setActiveSheet"
      @add-sheet="store.addSheet"
      @delete-sheet="store.deleteSheet"
      @rename-sheet="handleRenameSheet"
    />
    <div class="status-bar" aria-live="polite">
      <span>Prêt</span>
      <div class="status-spacer"></div>
      <button v-if="charts.length" class="chart-toggle" type="button" @click="showCharts = !showCharts">Graphiques ({{ charts.length }})</button>
      <template v-if="selectionStatistics.count">
        <span>Nombre : {{ selectionStatistics.count }}</span>
        <template v-if="selectionStatistics.numericCount">
          <span>Moyenne : {{ formatStatistic(selectionStatistics.average) }}</span>
          <span>Somme : {{ formatStatistic(selectionStatistics.sum) }}</span>
        </template>
      </template>
    </div>
    
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
      @format-cells="store.showFormatModal = true"
      @validation="store.showValidationModal = true"
      @sort-asc="handleSortAscending"
      @sort-desc="handleSortDescending"
      @click.stop
    />
    
    <!-- Formula Help Modal -->
    <FormulaHelpModal
      :show="store.showFormulaHelp"
      @close="store.showFormulaHelp = false"
    />
  </div>
  
  <!-- Modals -->
  <BorderSelector
    :show="showBorderSelector"
    @apply="store.applyBorder"
    @close="showBorderSelector = false"
  />
  <ValidationModal :show="store.showValidationModal" :rule="selectedValidationRule" @close="store.showValidationModal = false" @save="handleSaveValidation" @clear="handleClearValidation" />
  <ConditionalFormatModal :show="showConditionalFormat" :rules="activeSheet.conditionalFormats || []" :selection="conditionalSelection" @close="showConditionalFormat = false" @save="store.saveConditionalFormat" @remove="store.removeConditionalFormat" />

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
    :spreadsheet-name="spreadsheetName"
    @close="showPrintPreview = false"
    @print="handlePrint"
  />

  <!-- Toast -->
  <Toast ref="toastRef" />
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import type { CellPosition, CellFormat, ValidationRule } from './types/spreadsheet'
import { indexToColumn, cellKey } from './utils/helpers'
import { selectionStats } from './utils/selectionStats'
import { useSpreadsheetStore } from './stores'
import { 
  exportToCSV, 
  exportWorkbook,
  importFromCSV, 
  importWorkbook,
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
import ValidationModal from './components/ValidationModal.vue'
import ConditionalFormatModal from './components/ConditionalFormatModal.vue'
import Toast from './components/Toast.vue'
import ChartPanel from './components/ChartPanel.vue'

// ============================================================================
// STORE INITIALIZATION
// ============================================================================

const store = useSpreadsheetStore()

// Destructurer les refs pour les templates (évite .value dans les templates)
const {
  spreadsheet,
  selectedCell,
  selectionRange,
  editingCell,
  currentFormat,
  canUndo,
  canRedo,
  selectedCellData,
  isMergeActive,
  isFavorite,
  autofilterRange,
  hiddenRows
} = storeToRefs(store)

// Wrappers pour les propriétés imbriquées (évite les accès complexes dans le template)
const spreadsheetName = computed(() => spreadsheet.value.name)
const zoom = computed(() => spreadsheet.value.zoom)
const activeSheet = computed(() => store.activeSheet)
const showGrid = computed(() => spreadsheet.value.showGrid)
const showConditionalFormat = ref(false)
const conditionalSelection = computed(() => selectionRange.value || (selectedCell.value ? { sri: selectedCell.value.row, eri: selectedCell.value.row, sci: selectedCell.value.col, eci: selectedCell.value.col } : null))
const selectedValidationRule = computed(() => activeSheet.value.validations.find(({ range }) => selectedCell.value && selectedCell.value.row >= range.sri && selectedCell.value.row <= range.eri && selectedCell.value.col >= range.sci && selectedCell.value.col <= range.eci)?.rule)
const selectionStatistics = computed(() => selectionStats(store.sheetsData[spreadsheet.value.activeSheetId] || {}, selectionRange.value, store.formulaContext))
const showCharts = ref(false)
const selectedChartId = ref<string | null>(null)
const charts = computed(() => activeSheet.value.charts || [])
const selectedChart = computed(() => charts.value.find(chart => chart.id === selectedChartId.value) || charts.value[0])
const formatStatistic = (value: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 4 }).format(value)

const toastRef = ref<InstanceType<typeof Toast> | null>(null)
const findOpen = ref(false)
const findQuery = ref('')
const findInput = ref<HTMLInputElement | null>(null)
const findMatches = computed(() => {
  const query = findQuery.value.toLocaleLowerCase()
  if (!query) return []
  return Object.values(store.sheetsData[spreadsheet.value.activeSheetId] || {})
    .filter(cell => `${cell.value}\n${cell.formula || ''}`.toLocaleLowerCase().includes(query))
    .sort((a, b) => a.row - b.row || a.col - b.col)
})
function findMatch(direction: 1 | -1) {
  const matches = findMatches.value
  if (!matches.length) return
  const index = matches.findIndex(cell => cell.row === selectedCell.value?.row && cell.col === selectedCell.value?.col)
  const next = index < 0 ? (direction === 1 ? 0 : matches.length - 1) : (index + direction + matches.length) % matches.length
  store.selectCell({ row: matches[next].row, col: matches[next].col })
}
function openFind() {
  findOpen.value = true
  nextTick(() => findInput.value?.focus())
}
watch(() => store.saveError, message => {
  if (message) toastRef.value?.error(message)
})
watch(() => store.validationError, message => {
  if (message) toastRef.value?.error(message)
}, { flush: 'sync' })

function handleSaveValidation(rule: ValidationRule) {
  store.addValidation(rule)
  store.showValidationModal = false
  toastRef.value?.success('Règle de validation appliquée')
}
function handleClearValidation() {
  store.clearValidation()
  store.showValidationModal = false
  toastRef.value?.success('Règle de validation supprimée')
}

// ============================================================================
// UI STATE (hors store)
// ============================================================================

const contextMenu = reactive({
  show: false,
  position: { x: 0, y: 0 }
})
const clipboardToken = `${Date.now()}-${Math.random()}`
const clipboardMime = 'application/x-grid-vue'
function isTextEditingTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && !!target.closest('input, textarea, [contenteditable="true"]')
}
function handleSystemCopy(event: ClipboardEvent) {
  if (isTextEditingTarget(event.target) || !event.clipboardData || !selectedCell.value) return
  if (event.type === 'cut') store.cut()
  else store.copy()
  event.clipboardData.setData('text/plain', store.selectionAsText())
  event.clipboardData.setData(clipboardMime, clipboardToken)
  event.preventDefault()
}
function handleSystemPaste(event: ClipboardEvent) {
  if (isTextEditingTarget(event.target) || !event.clipboardData || !selectedCell.value) return
  if (event.clipboardData.getData(clipboardMime) === clipboardToken) store.paste()
  else if (event.clipboardData.types.includes('text/plain')) store.pasteText(event.clipboardData.getData('text/plain'))
  else return
  event.preventDefault()
}

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

function handleFormulaChange(value: string, position: CellPosition) {
  store.updateCellValue(position, value)
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
  if (!store.validationError) toastRef.value?.success('Cellules collées')
}

function handleFilterClick(col: number, position: { top: number; left: number }) {
  if (!autofilterRange.value) return

  const values: string[] = []
  const { sri, eri } = autofilterRange.value
  const activeId = spreadsheet.value.activeSheetId

  for (let row = sri + 1; row <= eri; row++) {
    const key = cellKey(row, col)
    const cell = store.sheetsData[activeId]?.[key]
    values.push(cell?.value || '')
  }

  filterColumnIndex.value = col
  filterColumnValues.value = values
  filterSelectedValues.value = store.activeFilters.get(col) || [...new Set(values)]
  filterDropdownPosition.value = position
  showFilterDropdown.value = true
}

function handleApplyFilter(selectedValues: string[]) {
  store.applyFilter(filterColumnIndex.value, selectedValues)
}

function handleShare() {
  toastRef.value?.info('Le partage de classeur sera disponible avec la sauvegarde en ligne.')
}

function handleInsertChart() {
  const id = store.addChart()
  if (!id) {
    toastRef.value?.info('Sélectionnez une plage de 2 à 200 lignes et de 1 à 9 colonnes.')
    return
  }
  selectedChartId.value = id
  showCharts.value = true
}

function handleFreeze() {
  if (!activeSheet.value.freeze && selectedCell.value?.row === 1 && selectedCell.value.col === 1) {
    toastRef.value?.info('Sélectionnez une cellule sous les lignes et à droite des colonnes à figer.')
    return
  }
  const unfreezing = !!activeSheet.value.freeze
  store.freezePanes()
  toastRef.value?.success(unfreezing ? 'Volets libérés' : 'Volets figés')
}

function handleRenameSheet(id: string, name: string) {
  if (!store.renameSheet(id, name)) toastRef.value?.error('Nom invalide ou déjà utilisé (31 caractères maximum).')
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
  if (name && selectedCell.value) {
    store.updateCellValue(selectedCell.value, `=${name}()`)
    toastRef.value?.success(`Fonction ${name} insérée`)
  } else {
    store.showFormulaHelp = true
  }
}

function handleCurrencyFormat() {
  if (!selectionRange.value && !selectedCell.value) {
    toastRef.value?.info('Sélectionnez une cellule d\'abord')
    return
  }
  store.applyCurrencyFormat()
  toastRef.value?.success('Format € appliqué')
}

function handlePercentageFormat() {
  if (!selectionRange.value && !selectedCell.value) {
    toastRef.value?.info('Sélectionnez une cellule d\'abord')
    return
  }
  store.applyPercentageFormat()
  toastRef.value?.success('Format % appliqué')
}

function handleNumberFormat() {
  if (!selectionRange.value && !selectedCell.value) {
    toastRef.value?.info('Sélectionnez une cellule d\'abord')
    return
  }
  store.applyNumberFormat()
  toastRef.value?.success('Format nombre appliqué')
}

function handleSortAscending() {
  if (!selectionRange.value && !selectedCell.value) {
    toastRef.value?.info('Sélectionnez une colonne d\'abord')
    return
  }
  store.sortAscending()
  toastRef.value?.success('Tri A-Z effectué')
}

function handleSortDescending() {
  if (!selectionRange.value && !selectedCell.value) {
    toastRef.value?.info('Sélectionnez une colonne d\'abord')
    return
  }
  store.sortDescending()
  toastRef.value?.success('Tri Z-A effectué')
}

function handleClearFormat() {
  if (!selectionRange.value && !selectedCell.value) {
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
  if (!selectionRange.value && !selectedCell.value) {
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
  const activeId = spreadsheet.value.activeSheetId
  const cellsMap = new Map(Object.entries(store.sheetsData[activeId] || {}))
  exportToCSV(cellsMap, spreadsheetName.value + '.csv', store.formulaContext)
  toastRef.value?.success('Export CSV réussi')
}

async function handleExportXLSX() {
  try {
    await exportWorkbook(spreadsheet.value.sheets, store.sheetsData, spreadsheetName.value + '.xlsx')
    toastRef.value?.success('Export XLSX réussi')
    if (spreadsheet.value.sheets.some(sheet => sheet.charts?.length || sheet.conditionalFormats?.length)) toastRef.value?.warning('Les graphiques et mises en forme conditionnelles ne sont pas inclus dans le fichier XLSX.', 8000)
  } catch (error) {
    toastRef.value?.error(error instanceof Error ? error.message : 'Erreur lors de l’exportation XLSX')
  }
}

function handleImportCSV() {
  createFileInput('.csv', async (file) => {
    try {
      const cells = await importFromCSV(file)
      store.saveState('Import CSV')
      const activeId = spreadsheet.value.activeSheetId
      store.sheetsData[activeId] = Object.fromEntries(cells)
      toastRef.value?.success('Import CSV réussi')
    } catch (error) {
      toastRef.value?.error('Erreur lors de l\'importation CSV')
    }
  })
}

function handleImportXLSX() {
  createFileInput('.xlsx,.xls', async (file) => {
    try {
      const workbook = await importWorkbook(file)
      store.saveState('Import XLSX')
      spreadsheet.value.sheets = workbook.sheets
      store.sheetsData = workbook.data
      store.setActiveSheet(workbook.sheets[0].id)
      toastRef.value?.success('Import XLSX réussi')
      if (workbook.warnings?.length) toastRef.value?.warning(workbook.warnings.join(' '), 8000)
      toastRef.value?.info('Les graphiques et certaines fonctions Excel avancées peuvent ne pas être importés.', 8000)
    } catch (error) {
      toastRef.value?.error(error instanceof Error ? `Import XLSX : ${error.message}` : 'Erreur lors de l’importation XLSX')
    }
  })
}

// ============================================================================
// UTILS
// ============================================================================

function getSelectedPositions(): CellPosition[] {
  const positions: CellPosition[] = []
  if (selectionRange.value) {
    for (const pos of iterateRange(selectionRange.value)) {
      positions.push(pos)
    }
  } else if (selectedCell.value) {
    positions.push(selectedCell.value)
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
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault()
    if (store.saveWorkbook()) toastRef.value?.success('Classeur enregistré sur cet appareil')
    return
  }
  const target = e.target as HTMLElement | null
  if (target?.closest('input, textarea, [contenteditable="true"]')) return
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
      case 'y':
        e.preventDefault()
        store.redo()
        break
      case 'b':
        e.preventDefault()
        handleFormatChange({ bold: !currentFormat.value.bold })
        break
      case 'i':
        e.preventDefault()
        handleFormatChange({ italic: !currentFormat.value.italic })
        break
      case 'u':
        e.preventDefault()
        handleFormatChange({ underline: !currentFormat.value.underline })
        break
      case 'p':
        e.preventDefault()
        showPrintPreview.value = true
        break
      case 'f':
        e.preventDefault()
        openFind()
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
  if (store.saveError) toastRef.value?.error(store.saveError)
  window.addEventListener('beforeunload', store.saveWorkbook)
  document.addEventListener('keydown', handleGlobalKeyDown)
  document.addEventListener('copy', handleSystemCopy)
  document.addEventListener('cut', handleSystemCopy)
  document.addEventListener('paste', handleSystemPaste)
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('contextmenu', handleContextMenu)
})

onUnmounted(() => {
  window.removeEventListener('beforeunload', store.saveWorkbook)
  document.removeEventListener('keydown', handleGlobalKeyDown)
  document.removeEventListener('copy', handleSystemCopy)
  document.removeEventListener('cut', handleSystemCopy)
  document.removeEventListener('paste', handleSystemPaste)
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
  display: flex;
  min-height: 0;
  overflow: hidden;
  position: relative;
}

.find-bar { display: flex; align-items: center; gap: 8px; padding: 6px 10px; background: #f5f7f5; border-bottom: 1px solid #d7ded9; font-size: 12px; }
.find-bar input { width: min(300px, 45vw); padding: 5px 8px; border: 1px solid #aebbb1; border-radius: 3px; background: #fff; }
.find-bar button { padding: 3px 8px; border-radius: 3px; color: #25683e; font-size: 16px; }
.find-bar button:hover { background: #e0ebe3; }
.status-bar { display: flex; align-items: center; gap: 18px; min-height: 25px; padding: 0 12px; background: #f4f6f4; border-top: 1px solid #d7ded9; color: #525b54; font-size: 11px; }
.status-spacer { flex: 1; }
.chart-toggle { color: #107c41; cursor: pointer; }
.chart-toggle:hover { text-decoration: underline; }

.grid-wrapper > .grid-container {
  flex: 1;
  min-width: 0;
  height: 100%;
  grid-template-columns: 50px minmax(0, 1fr);
  grid-template-rows: 25px minmax(0, 1fr);
}
.spreadsheet-app .grid-container .cell.selected,
.spreadsheet-app .grid-container .cell.editing { outline-color: #107c41; }
.spreadsheet-app .grid-container .selection-border { border-color: #107c41; }
.spreadsheet-app .grid-container .autofill-handle { background: #107c41; }
.spreadsheet-app .grid-container .col-header.selected,
.spreadsheet-app .grid-container .row-header.selected { background: #dbeee1; color: #107c41; }
.spreadsheet-app .grid-container .col-headers,
.spreadsheet-app .grid-container .row-headers { position: relative; }

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
