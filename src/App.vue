<script setup lang="ts">
import { onMounted, ref } from 'vue'
import './noovy.css'
import { readWorkbook, writeWorkbook } from './noovy-storage'
import Spreadsheet from 'x-data-spreadsheet/src/index.js'
import french from './noovy-fr'
import cellEngine from 'x-data-spreadsheet/src/core/cell.js'
import { formulam } from 'x-data-spreadsheet/src/core/formula.js'

const container = ref<HTMLElement | null>(null)
const status = ref('Chargement…')
const ready = ref(false)
const saving = ref(false)
let spreadsheet: Spreadsheet | undefined
const defaultTitle = 'Feuille sans titre'
const title = ref(defaultTitle)
let savedTitle = defaultTitle
const dirty = ref(false)
const formulaHost = ref<HTMLElement>()
const statsHost = ref<HTMLElement>()
const address = ref('A1')
const formula = ref('')
const stats = ref<number[]>([])
const formatNumber = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 8 })
let saved = ''

function refresh() {
  if (!spreadsheet) return
  const data = spreadsheet.sheet.data
  const { ri, ci, range } = data.selector
  let column = ''
  for (let index = ci + 1; index > 0; index = Math.floor((index - 1) / 26)) {
    column = String.fromCharCode(65 + (index - 1) % 26) + column
  }
  address.value = column && ri >= 0 ? column + (ri + 1) : ''
  formula.value = data.getSelectedCell()?.text ?? ''
  const values: number[] = []
  for (const row of Object.keys(data.rows._)) {
    const index = Number(row)
    if (index < range.sri || index > range.eri || data.exceptRowSet.has(index)) continue
    const source = data.sortedRowMap.get(index) ?? index
    const cells = data.rows._[source]?.cells ?? {}
    for (const [col, cell] of Object.entries(cells)) {
      if (Number(col) < range.sci || Number(col) > range.eci) continue
      let value = String(cell.text ?? '')
      if (value.startsWith('=')) {
        try {
          value = String(cellEngine.render(value, formulam, (row, col) => data.getCellTextOrDefault(col, row)) ?? '')
        } catch {
          continue
        }
      }
      if (/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim()) && Number.isFinite(Number(value))) {
        values.push(Number(value))
      }
    }
  }
  stats.value = values.length ? [values.reduce((sum, value) => sum + value, 0), values.length] : []
  dirty.value = JSON.stringify(spreadsheet.getData()) !== saved || title.value !== savedTitle
}

function applyFormula() {
  if (!spreadsheet || !address.value) return
  const { data, toolbar } = spreadsheet.sheet
  if (data.getSelectedCell()?.editable === false || formula.value === (data.getSelectedCell()?.text ?? '')) return
  const text = formula.value
  data.changeData(() => data.setSelectedCellText(text))
  toolbar.reset()
  spreadsheet.reRender()
  refresh()
}

async function loadWorkbook() {
  if (!container.value || ready.value) return
  status.value = 'Chargement…'
  try {
    const workbook = await readWorkbook()
    title.value = savedTitle = workbook?.title ?? defaultTitle
    Spreadsheet.locale('fr', french)
    spreadsheet = new Spreadsheet(container.value, {
      row: { height: 28 },
      col: { width: 104, indexWidth: 48 },
      view: {
        height: () => Math.max(0, (container.value?.clientHeight ?? 0) - 44),
        width: () => container.value?.clientWidth ?? 0,
      },
    })
    if (workbook) spreadsheet.loadData(workbook.sheets)
    saved = JSON.stringify(spreadsheet.getData())
    const host = document.createElement('div')
    container.value.querySelector('.x-spreadsheet-sheet')?.before(host)
    formulaHost.value = host
    const footer = document.createElement('div')
    container.value.querySelector('.x-spreadsheet-bottombar')?.append(footer)
    statsHost.value = footer
    const update = () => queueMicrotask(refresh)
    const updateAfterInteraction = () => requestAnimationFrame(refresh)
    spreadsheet.on('cell-selected', update).on('cells-selected', update).on('change', update)
    container.value.addEventListener('click', updateAfterInteraction)
    container.value.addEventListener('focusout', updateAfterInteraction)
    window.addEventListener('keyup', (event) => {
      if (event.target instanceof Element && event.target.closest('.noovy-formula, .noovy-header')) return
      updateAfterInteraction()
    })
    document.fonts.ready.then(() => spreadsheet?.reRender())
    refresh()
    ready.value = true
    status.value = ''
  } catch {
    status.value = 'Impossible de charger le classeur.'
  }
}

async function saveWorkbook() {
  if (!spreadsheet || saving.value) return
  saving.value = true
  status.value = 'Enregistrement…'
  try {
    const snapshot = JSON.stringify(spreadsheet.getData())
    const workbookTitle = title.value.trim() || 'Feuille sans titre'
    await writeWorkbook({ title: workbookTitle, sheets: JSON.parse(snapshot) })
    saved = snapshot
    savedTitle = workbookTitle
    if (title.value.trim() === workbookTitle || !title.value.trim()) title.value = workbookTitle
    refresh()
    status.value = 'Classeur enregistré sur cet appareil.'
  } catch {
    status.value = 'Échec de l’enregistrement. Réessayez.'
  } finally {
    saving.value = false
  }
}

const fileInput = ref<HTMLInputElement>()
const transferring = ref(false)

async function importWorkbook(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || !spreadsheet || transferring.value) return
  if (dirty.value && !window.confirm('Remplacer le classeur ouvert et ses modifications non enregistrées ?')) return
  transferring.value = true
  try {
    const { importXlsx } = await import('./noovy-xlsx')
    const sheets = importXlsx(await file.arrayBuffer())
    if (!sheets.length) throw new Error('Classeur vide')
    spreadsheet.loadData(sheets)
    title.value = file.name.replace(/\.xlsx$/i, '')
    refresh()
    status.value = 'Classeur importé. Enregistrez pour le conserver.'
  } catch {
    status.value = 'Impossible d’importer ce fichier Excel.'
  } finally {
    transferring.value = false
  }
}

async function exportWorkbook() {
  if (!spreadsheet || transferring.value) return
  transferring.value = true
  try {
    const { exportXlsx } = await import('./noovy-xlsx')
    exportXlsx(spreadsheet.getData(), title.value)
  } catch {
    status.value = 'Impossible d’exporter le classeur.'
  } finally {
    transferring.value = false
  }
}

onMounted(loadWorkbook)
</script>

<template>
  <header class="noovy-header">
    <div class="noovy-brand">
      <span class="noovy-mark" aria-hidden="true">
        <svg viewBox="0 0 36 36" width="36" height="36" fill="none">
          <rect width="36" height="36" rx="9" fill="#102B23"/>
          <path d="M12 1v34M24 1v34M1 12h34M1 24h34" stroke="#B9EBD4" opacity=".15"/>
          <rect x="6.5" y="6.5" width="23" height="23" rx="2.5" stroke="#77E0AB" stroke-width="1.5"/>
          <path d="M10.5 26V10h3.6l8 10.2V10h3.4v16h-3.6l-8-10.2V26z" fill="#E0F8EB"/>
          <rect x="27.5" y="27.5" width="5" height="5" rx="1" fill="#77E0AB" stroke="#102B23"/>
        </svg>
      </span>
      <span class="noovy-wordmark">Noovy<span class="noovy-word-grid">Grid</span></span>
    </div>
    <span class="noovy-divider" aria-hidden="true"></span>
    <input v-model="title" class="noovy-title" aria-label="Nom du classeur" placeholder="Feuille sans titre" @input="refresh" @keydown.stop @paste.stop @copy.stop @cut.stop>
    <span class="noovy-status" role="status">{{ dirty && !saving && (status === '' || status === 'Classeur enregistré sur cet appareil.') ? 'Modifications non enregistrées' : status }}</span>
    <div v-if="ready" class="noovy-actions">
      <input ref="fileInput" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden @change="importWorkbook">
      <button class="noovy-secondary" type="button" :disabled="saving || transferring" @click="fileInput?.click()">Importer</button>
      <button class="noovy-secondary" type="button" :disabled="transferring" @click="exportWorkbook">Exporter</button>
      <button type="button" :disabled="saving || transferring" @click="saveWorkbook">Enregistrer</button>
    </div>
    <button v-else-if="status !== 'Chargement…'" type="button" @click="loadWorkbook">Réessayer</button>
  </header>
  <main ref="container" class="spreadsheet" aria-label="Tableur"></main>
  <Teleport v-if="formulaHost" :to="formulaHost">
    <form class="noovy-formula" @submit.prevent="applyFormula" @keydown.stop @paste.stop @copy.stop @cut.stop>
      <input :value="address" aria-label="Cellule active" readonly>
      <span aria-hidden="true">fx</span>
      <input v-model="formula" @keydown.enter.prevent="applyFormula" aria-label="Contenu de la cellule active" placeholder="Saisir une valeur ou une formule" :disabled="!address">
    </form>
  </Teleport>
  <Teleport v-if="statsHost" :to="statsHost">
    <div v-if="stats.length" class="noovy-stats">
      <span>Somme : {{ formatNumber.format(stats[0]) }}</span>
      <span>Moyenne : {{ formatNumber.format(stats[0] / stats[1]) }}</span>
      <span>Nombre : {{ stats[1] }}</span>
    </div>
  </Teleport>
</template>
