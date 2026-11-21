<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import './noovy.css'
import './noovy-premium.css'
import Spreadsheet from 'x-data-spreadsheet/src/index.js'
import french from './noovy-fr'
import cellEngine from 'x-data-spreadsheet/src/core/cell.js'
import { formulam } from 'x-data-spreadsheet/src/core/formula.js'
import { cellAddress, collectSelectionNumbers, numericStats, type SelectionStats } from './services/gridView'
import { cacheWorkbook, detachRemoteWorkbook, openWorkbook, persistWorkbook } from './services/workbookSession'
import { DEFAULT_WORKBOOK_TITLE, toWorkbookPayload } from './services/workbookService'
import type { GridSheet } from './types/api'

const LOADING_MESSAGE = 'Chargement…'
const CONFIRM_REPLACE = 'Remplacer le classeur ouvert et ses modifications non enregistrées ?'

/** Sous 480 px la mise en page mobile empile ses cartes : la grille réserve
    la barre de formule (52 px), deux gouttières de 8 px et les pastilles de
    groupe du carrousel (12 px + 4 px). */
const MOBILE_CHROME = 84
const isPhone = () => window.matchMedia('(max-width: 480px)').matches

const container = ref<HTMLElement | null>(null)
const status = ref(LOADING_MESSAGE)
const ready = ref(false)
const saving = ref(false)
const transferring = ref(false)
const dirty = ref(false)
const title = ref(DEFAULT_WORKBOOK_TITLE)
const remoteId = ref<string | null>(null)
const address = ref('A1')
const formula = ref('')
const selectionStats = ref<SelectionStats | null>(null)
const formulaHost = ref<HTMLElement>()
const statsHost = ref<HTMLElement>()
const fileInput = ref<HTMLInputElement>()
const menuOpen = ref(false)
const menuButton = ref<HTMLButtonElement>()
const menuHost = ref<HTMLElement>()

const DESIGN_STORAGE_KEY = 'noovy-design'

function readStoredDesign(): boolean {
  try {
    return window.localStorage.getItem(DESIGN_STORAGE_KEY) === 'premium'
  } catch {
    return false
  }
}

const premium = ref(readStoredDesign())
if (premium.value) document.documentElement.dataset.design = 'premium'

const paletteOpen = ref(false)
const paletteQuery = ref('')
const paletteIndex = ref(0)
const paletteInput = ref<HTMLInputElement>()
const explainOpen = ref(false)
const sheetName = ref('')
const renderedCell = ref('')

// Mode « Actions rapides » : barre contextuelle au-dessus des onglets.
const quickOpen = ref(false)
const quickFind = ref(false)
const quickAnswer = ref(false)
const quickAnswerText = ref('')
const quickQuery = ref('')
const quickMiss = ref(false)
const quickInput = ref<HTMLInputElement>()
// Groupe de la barre d'outils affiché par l'indicateur du carrousel mobile.
const groupCount = ref(0)
const groupIndex = ref(0)
let findFrom: number | null = null

type Command = { id: string; label: string; group: string }

const formatNumber = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 8 })
let spreadsheet: Spreadsheet | undefined
let savedTitle = DEFAULT_WORKBOOK_TITLE
let savedSnapshot = ''
let resizeObserver: ResizeObserver | undefined
let toolbarObserver: MutationObserver | undefined
let scrollHost: HTMLElement | null = null

/** Statut affiché : l'enregistrement et les modifications en cours priment. */
const statusText = computed(() => {
  if (saving.value) return 'Enregistrement…'
  if (dirty.value) return 'Modifications non enregistrées'
  return status.value
})

/** Actions proposées par la palette du design premium. */
const commands = computed<Command[]>(() => {
  const list: Command[] = [
    { id: 'save', label: 'Enregistrer le classeur', group: 'Classeur' },
    { id: 'import', label: 'Importer un fichier .xlsx', group: 'Classeur' },
    { id: 'export-xlsx', label: 'Exporter en .xlsx', group: 'Classeur' },
    { id: 'export-csv', label: 'Exporter la feuille en CSV', group: 'Classeur' },
    { id: 'add-sheet', label: 'Ajouter une feuille', group: 'Feuilles' },
    { id: 'insert-row', label: 'Insérer une ligne', group: 'Édition' },
    { id: 'explain', label: 'Expliquer la cellule', group: 'Comprendre' },
    { id: 'design', label: premium.value ? 'Revenir au design classique' : 'Passer au design premium', group: 'Apparence' },
  ]
  const query = paletteQuery.value.trim().toLowerCase()
  return query ? list.filter((command) => command.label.toLowerCase().includes(query)) : list
})

// ============================================================================
// SYNCHRONISATION DE LA VUE AVEC LA GRILLE
// ============================================================================

/** Évalue une formule de cellule ; null si le moteur ne sait pas la calculer. */
function evaluateFormula(text: string): string | null {
  try {
    return String(cellEngine.render(text, formulam, (row: number, col: number) => spreadsheet?.sheet.data.getCellTextOrDefault(col, row) ?? '') ?? '')
  } catch {
    return null
  }
}

/** Adresse, barre de formule, statistiques de sélection et indicateur « modifié ». */
function refresh() {
  if (!spreadsheet) return
  const data = spreadsheet.sheet.data
  address.value = cellAddress(data.selector.ri, data.selector.ci)
  formula.value = data.getSelectedCell()?.text ?? ''
  selectionStats.value = numericStats(collectSelectionNumbers(data, evaluateFormula))
  dirty.value = JSON.stringify(spreadsheet.getData()) !== savedSnapshot || title.value !== savedTitle
  sheetName.value = activeSheetName()
  renderedCell.value = formula.value.startsWith('=') ? (evaluateFormula(formula.value) ?? '—') : formula.value
}

/** Recalcule la hauteur de la grille ; l'image suivante rattrape une mise en page tardive. */
function fitGrid() {
  // La barre range des boutons dans « Plus » quand la place manque : les
  // groupes sont remarkés à chaque changement de taille.
  markToolbarGroups()
  spreadsheet?.reRender()
  requestAnimationFrame(() => spreadsheet?.reRender())
}

/** Nom de la feuille affichée, lu depuis les données du classeur. */
function activeSheetName(): string {
  const grid = spreadsheet as unknown as { datas?: { name: string }[]; sheet?: { data: unknown } } | undefined
  const datas = grid?.datas ?? []
  const index = datas.indexOf(grid?.sheet?.data as never)
  return index >= 0 ? datas[index].name : ''
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

/** Classeur prêt à être envoyé : titre normalisé et grille au format x-data-spreadsheet. */
function readPayload() {
  return toWorkbookPayload(title.value, spreadsheet?.getData() ?? [])
}

/** Enregistre l'état courant comme référence : la grille n'est plus « modifiée ». */
function markSaved(savedName: string, snapshot: string) {
  savedSnapshot = snapshot
  savedTitle = savedName
  if (title.value.trim() === savedName || !title.value.trim()) title.value = savedName
  refresh()
}

// ============================================================================
// MONTAGE
// ============================================================================

/**
 * Groupes du carrousel : les séparateurs de la librairie délimitent les pages.
 * On marque le premier bouton visible après chaque séparateur plutôt que des
 * positions fixes, qui se décaleraient au moindre bouton ajouté ou masqué.
 */
function markToolbarGroups() {
  const list = container.value?.querySelector<HTMLElement>('.x-spreadsheet-toolbar-btns')
  if (!list) return
  let startsGroup = true
  let last: HTMLElement | undefined
  for (const item of Array.from(list.children) as HTMLElement[]) {
    item.classList.remove('noovy-snap-end')
    if (item.classList.contains('x-spreadsheet-toolbar-divider')) {
      startsGroup = true
      continue
    }
    const visible = item.getBoundingClientRect().width > 0
    item.classList.toggle('noovy-snap-start', visible && startsGroup)
    if (!visible) continue
    startsGroup = false
    last = item
  }
  // Une accroche de fin au bout des outils : sans elle, la dernière page
  // resterait hors d'atteinte d'un carrousel qui s'arrête sur les débuts.
  last?.classList.add('noovy-snap-end')
  syncToolbarGroup()
}

/** Groupe posé au bord gauche de la barre : celui qu'affiche l'indicateur. */
function syncToolbarGroup() {
  const bar = container.value?.querySelector<HTMLElement>('.x-spreadsheet-toolbar')
  if (!bar) return
  const starts = [...bar.querySelectorAll<HTMLElement>('.noovy-snap-start')]
  groupCount.value = starts.length
  if (!starts.length) {
    groupIndex.value = 0
    return
  }
  // Dernière page : la barre est au bout, c'est son dernier groupe qui compte.
  if (bar.scrollLeft >= bar.scrollWidth - bar.clientWidth - 2) {
    groupIndex.value = starts.length - 1
    return
  }
  // Groupe dont le début est passé sous le bord gauche (largeur d'un bouton).
  const origin = bar.getBoundingClientRect().left
  const edge = bar.scrollLeft + 48
  let active = 0
  for (const [index, start] of starts.entries()) {
    if (start.getBoundingClientRect().left - origin + bar.scrollLeft > edge) break
    active = index
  }
  groupIndex.value = active
}

/** Insère la barre de formule et les statistiques dans le DOM de la librairie. */
function mountPanels(root: HTMLElement) {
  const host = document.createElement('div')
  host.className = 'noovy-formula-host'
  root.querySelector('.x-spreadsheet-sheet')?.before(host)
  formulaHost.value = host
  const footer = document.createElement('div')
  root.querySelector('.x-spreadsheet-bottombar')?.append(footer)
  statsHost.value = footer

  // Carrousel : groupes marqués depuis les séparateurs, et remarqués si la
  // librairie reconstruit la barre (changement de feuille, chargement).
  const toolbar = root.querySelector<HTMLElement>('.x-spreadsheet-toolbar')
  const toolbarList = toolbar?.querySelector<HTMLElement>('.x-spreadsheet-toolbar-btns')
  toolbarObserver?.disconnect()
  if (toolbarList) {
    toolbarObserver = new MutationObserver(markToolbarGroups)
    toolbarObserver.observe(toolbarList, { childList: true })
  }
  markToolbarGroups()

  // La librairie fige sa hauteur au montage : on la recalcule à chaque
  // changement de taille de la carte (fenêtre, panneau, zoom).
  resizeObserver?.disconnect()
  resizeObserver = new ResizeObserver(fitGrid)
  resizeObserver.observe(root)
  fitGrid()

  const update = () => queueMicrotask(refresh)
  const updateAfterInteraction = () => requestAnimationFrame(refresh)
  spreadsheet?.on('cell-selected', () => {
    quickAnswer.value = false
    update()
  }).on('cells-selected', update).on('change', update)
  root.querySelector('.x-spreadsheet-bottombar')?.addEventListener('click', () => {
    quickAnswer.value = false
  })
  root.addEventListener('click', updateAfterInteraction)
  root.addEventListener('focusout', updateAfterInteraction)
  window.addEventListener('keyup', (event) => {
    if (event.target instanceof Element && event.target.closest('.noovy-formula, .noovy-header')) return
    updateAfterInteraction()
  })
  document.fonts.ready.then(() => spreadsheet?.reRender())
}

async function loadWorkbook() {
  if (!container.value || ready.value) return
  status.value = LOADING_MESSAGE
  const opened = await openWorkbook()

  try {
    title.value = savedTitle = opened.workbook?.title ?? DEFAULT_WORKBOOK_TITLE
    remoteId.value = opened.remoteId
    Spreadsheet.locale('fr', french)
    spreadsheet = new Spreadsheet(container.value, {
      row: { height: isPhone() ? 34 : 28 },
      col: { width: isPhone() ? 92 : 104, indexWidth: isPhone() ? 40 : 48 },
      view: {
        // La librairie déduit elle-même la barre d'outils et les onglets ;
        // il ne reste que la barre de formule (44 px) insérée au-dessus de la grille.
        height: () => Math.max(0, (container.value?.clientHeight ?? 0) - (isPhone() ? MOBILE_CHROME : 44)),
        width: () => container.value?.clientWidth ?? 0,
      },
    })
    if (opened.workbook) spreadsheet.loadData(opened.workbook.sheets)
    savedSnapshot = JSON.stringify(spreadsheet.getData())
    mountPanels(container.value)
    if (opened.cacheFromServer && opened.workbook) cacheWorkbook(opened.workbook)
    refresh()
    ready.value = true
    status.value = opened.status
  } catch {
    status.value = 'Impossible de charger le classeur.'
  }
}

// ============================================================================
// MENU FICHIER
// ============================================================================

/** Bascule les fonctions premium (palette, tiroir) ; le design ne change pas. */
async function toggleDesign() {
  premium.value = !premium.value
  if (premium.value) document.documentElement.dataset.design = 'premium'
  else delete document.documentElement.dataset.design
  try {
    window.localStorage.setItem(DESIGN_STORAGE_KEY, premium.value ? 'premium' : 'classique')
  } catch {
    // Préférence non persistée : le mode reste actif pour la session.
  }
  if (!premium.value) {
    paletteOpen.value = false
    explainOpen.value = false
  }
  // Attendre le retrait du tiroir : sans ses styles premium il
  // repassent un instant dans le flux et rétrécissent la carte, ce qui fausse
  // la hauteur lue par la grille et laisse un vide blanc en bas.
  await nextTick()
  fitGrid()
}

/** Palette de commandes : ouverte par Ctrl K. */
async function openPalette() {
  if (!premium.value) return
  paletteOpen.value = true
  paletteQuery.value = ''
  paletteIndex.value = 0
  await nextTick()
  paletteInput.value?.focus()
}

function closePalette() {
  paletteOpen.value = false
}

function movePalette(step: number) {
  const total = commands.value.length
  if (!total) return
  paletteIndex.value = (paletteIndex.value + step + total) % total
}

function onPaletteKey(event: KeyboardEvent) {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    movePalette(1)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    movePalette(-1)
  } else if (event.key === 'Enter') {
    event.preventDefault()
    const command = commands.value[paletteIndex.value]
    if (command) runCommand(command.id)
  } else if (event.key === 'Escape') {
    event.preventDefault()
    closePalette()
  }
}

function runCommand(id: string) {
  closePalette()
  if (id === 'save') void saveWorkbook()
  else if (id === 'import') fileInput.value?.click()
  else if (id === 'export-xlsx') void exportWorkbook()
  else if (id === 'export-csv') void exportCsv()
  else if (id === 'add-sheet') addSheet()
  else if (id === 'insert-row') insertRow()
  else if (id === 'explain') explainOpen.value = true
  else if (id === 'design') toggleDesign()
}

function addSheet() {
  if (!spreadsheet) return
  const grid = spreadsheet as unknown as {
    addSheet: () => unknown
    sheet: { resetData: (data: unknown) => void }
  }
  const sheet = grid.addSheet()
  grid.sheet.resetData(sheet)
  refresh()
  status.value = 'Feuille ajoutée. Enregistrez pour la conserver.'
}

function insertRow() {
  if (!spreadsheet) return
  const grid = spreadsheet as unknown as {
    sheet: { data: { insert: (type: string) => void }; reload: () => void }
  }
  grid.sheet.data.insert('row')
  grid.sheet.reload()
  refresh()
  status.value = 'Ligne insérée.'
}

// ============================================================================
// ACTIONS RAPIDES
// ============================================================================

type GridRect = { l: number; t: number; left: number; top: number; width: number; height: number }
type GridData = {
  selector: { ri: number; ci: number }
  rows: { len: number }
  cols: { len: number }
  insert: (type: string) => void
  getSelectedRect: () => GridRect
  freezeTotalWidth: () => number
  freezeTotalHeight: () => number
  getSelectedCell: () => { text?: string } | null
  getCellTextOrDefault: (ri: number, ci: number) => string
}
type GridInternals = {
  selector: { set: (ri: number, ci: number) => void }
  data: GridData
  getTableOffset: () => { width: number; height: number }
  verticalScrollbar: { move: (value: { top: number }) => void }
  horizontalScrollbar: { move: (value: { left: number }) => void }
  reload: () => void
}

function gridInternals(): GridInternals | undefined {
  return spreadsheet?.sheet as unknown as GridInternals | undefined
}

/** Texte affiché d'une cellule, formules évaluées. */
function cellDisplay(grid: GridInternals, ri: number, ci: number): string {
  const raw = grid.data.getCellTextOrDefault(ri, ci)
  return raw.startsWith('=') ? (evaluateFormula(raw) ?? raw) : raw
}

/** Affiche ou masque la barre d'actions ; elle ne s'ouvre jamais seule. */
function toggleQuick() {
  quickOpen.value = !quickOpen.value
  if (!quickOpen.value) {
    quickFind.value = false
    quickAnswer.value = false
  }
}

function closeQuick() {
  quickOpen.value = false
  quickFind.value = false
  quickAnswer.value = false
}

/** Sélectionne une cellule et la ramène dans la zone visible. */
function selectCell(ri: number, ci: number) {
  const grid = gridInternals()
  if (!grid) return
  grid.selector.set(ri, ci)
  const rect = grid.data.getSelectedRect()
  const offset = grid.getTableOffset()
  const freezeWidth = grid.data.freezeTotalWidth()
  const freezeHeight = grid.data.freezeTotalHeight()
  if (Math.abs(rect.left) + rect.width > offset.width) {
    grid.horizontalScrollbar.move({ left: rect.l + rect.width - offset.width })
  } else if (rect.left < freezeWidth) {
    grid.horizontalScrollbar.move({ left: rect.l - 1 - freezeWidth })
  }
  if (Math.abs(rect.top) + rect.height > offset.height) {
    grid.verticalScrollbar.move({ top: rect.t + rect.height - offset.height - 1 })
  } else if (rect.top < freezeHeight) {
    grid.verticalScrollbar.move({ top: rect.t - 1 - freezeHeight })
  }
  spreadsheet?.reRender()
  refresh()
}

/** « B3 » → indexes de la cellule. */
function refToIndexes(ref: string): { ri: number; ci: number } | null {
  const match = ref.match(/^([A-Za-z]+)(\d+)$/)
  if (!match) return null
  let ci = 0
  for (const letter of match[1].toUpperCase()) ci = ci * 26 + (letter.charCodeAt(0) - 64)
  return { ci: ci - 1, ri: Number(match[2]) - 1 }
}

/** Carte d'explication : décrit la cellule sélectionnée en français simple. */
function explainCell() {
  const grid = gridInternals()
  if (!grid) return
  const { ri, ci } = grid.data.selector
  const label = cellAddress(ri, ci)
  const raw = (grid.data.getSelectedCell()?.text ?? '').trim()
  const shown = cellDisplay(grid, ri, ci).trim()
  const numeric = shown !== '' && Number.isFinite(Number(shown.replace(',', '.')))
  const sum = raw.match(/^=(?:SOMME|SUM)\(([A-Z]+\d+):([A-Z]+\d+)\)$/i)

  let text: string
  if (raw === '') {
    text = `${label} est vide. Saisissez une valeur ou une formule dans la barre du haut.`
  } else if (sum) {
    const start = refToIndexes(sum[1])
    const end = refToIndexes(sum[2])
    const values: string[] = []
    if (start && end) {
      for (let row = Math.min(start.ri, end.ri); row <= Math.max(start.ri, end.ri); row += 1) {
        for (let col = Math.min(start.ci, end.ci); col <= Math.max(start.ci, end.ci); col += 1) {
          const value = cellDisplay(grid, row, col).trim()
          if (value !== '' && Number.isFinite(Number(value.replace(',', '.')))) values.push(value)
        }
      }
    }
    text = `Additionne les cellules ${sum[1].toUpperCase()} à ${sum[2].toUpperCase()} : ${values.join(' + ') || 'aucune valeur'} = ${shown}.`
  } else if (raw.startsWith('=')) {
    text = `Formule ${raw} : le résultat est ${shown}.`
  } else if (numeric) {
    const columnLabel = cellDisplay(grid, 0, ci).trim()
    const rowLabel = cellDisplay(grid, ri, 0).trim()
    text = ci > 0 && ri > 0 && columnLabel && rowLabel
      ? `${label} vaut ${shown}. C’est la valeur « ${columnLabel} » de la ligne « ${rowLabel} ».`
      : `${label} contient le nombre ${shown}.`
  } else {
    text = `${label} contient le texte « ${shown} ».`
  }
  quickAnswerText.value = text
  quickAnswer.value = true
}

/** Insère une ligne vide sous la ligne sélectionnée ; les formules se décalent. */
function insertRowBelow() {
  const grid = gridInternals()
  if (!grid) return
  const { ri, ci } = grid.data.selector
  grid.selector.set(ri + 1, ci)
  grid.data.insert('row')
  grid.reload()
  quickAnswer.value = false
  refresh()
  status.value = 'Ligne insérée sous la sélection.'
}

function startFind() {
  quickAnswer.value = false
  quickFind.value = true
  quickQuery.value = ''
  quickMiss.value = false
  findFrom = null
  void nextTick(() => quickInput.value?.focus())
}

function closeFind() {
  quickFind.value = false
  quickQuery.value = ''
  quickMiss.value = false
  findFrom = null
}

/** Entrée : cellule suivante qui contient la recherche, avec retour au début. */
function findNext() {
  const grid = gridInternals()
  const query = quickQuery.value.trim().toLowerCase()
  if (!grid || !query) return
  const { rows, cols } = grid.data
  const total = rows.len * cols.len
  if (!total) return
  const start = findFrom ?? grid.data.selector.ri * cols.len + grid.data.selector.ci
  for (let step = 1; step <= total; step += 1) {
    const index = (start + step) % total
    const ri = Math.floor(index / cols.len)
    const ci = index % cols.len
    if (cellDisplay(grid, ri, ci).toLowerCase().includes(query)) {
      selectCell(ri, ci)
      findFrom = index
      quickMiss.value = false
      return
    }
  }
  quickMiss.value = true
  window.setTimeout(() => { quickMiss.value = false }, 1200)
}

async function closeMenu(returnFocus = false) {
  if (!menuOpen.value) return
  menuOpen.value = false
  if (!returnFocus) return
  await nextTick()
  menuButton.value?.focus()
}

async function toggleMenu() {
  menuOpen.value = !menuOpen.value
  if (!menuOpen.value) return
  await nextTick()
  menuHost.value?.querySelector<HTMLElement>('[role="menuitem"]:not(:disabled)')?.focus()
}

/** Ferme le menu puis lance l'action choisie. */
function runMenuAction(action: () => void | Promise<void>) {
  void closeMenu()
  void action()
}

function onDocumentPointerDown(event: PointerEvent) {
  if (!menuOpen.value) return
  if (event.target instanceof Node && menuHost.value?.contains(event.target)) return
  void closeMenu()
}

function onDocumentKeyDown(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k' && premium.value) {
    event.preventDefault()
    void openPalette()
    return
  }
  if (event.key !== 'Escape') return
  if (paletteOpen.value) closePalette()
  else if (explainOpen.value) explainOpen.value = false
  else if (menuOpen.value) void closeMenu(true)
  else if (quickOpen.value) closeQuick()
}

/** Le défilement de la barre remonte en capture depuis le conteneur :
    l'écouteur y survit au remplacement de la barre par la librairie. */
function onScroll(event: Event) {
  if (event.target instanceof Element && event.target.classList.contains('x-spreadsheet-toolbar')) syncToolbarGroup()
}

onMounted(() => {
  loadWorkbook()
  scrollHost = container.value
  scrollHost?.addEventListener('scroll', onScroll, { capture: true, passive: true })
  document.addEventListener('pointerdown', onDocumentPointerDown)
  document.addEventListener('keydown', onDocumentKeyDown)
  window.addEventListener('resize', fitGrid)
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  toolbarObserver?.disconnect()
  scrollHost?.removeEventListener('scroll', onScroll, { capture: true })
  scrollHost = null
  window.removeEventListener('resize', fitGrid)
  document.removeEventListener('pointerdown', onDocumentPointerDown)
  document.removeEventListener('keydown', onDocumentKeyDown)
})

// ============================================================================
// ACTIONS
// ============================================================================

async function saveWorkbook() {
  if (!spreadsheet || saving.value) return
  saving.value = true
  status.value = 'Enregistrement…'
  try {
    const payload = readPayload()
    const snapshot = JSON.stringify(payload.sheets)
    const result = await persistWorkbook(payload, remoteId.value)
    remoteId.value = result.remoteId
    if (result.persisted) markSaved(payload.title, snapshot)
    status.value = result.status
  } finally {
    saving.value = false
  }
}

/** Exécute un import/export en bloquant les actions concurrentes. */
async function withTransfer(action: () => Promise<void>, failureMessage: string) {
  if (transferring.value) return
  transferring.value = true
  try {
    await action()
  } catch {
    status.value = failureMessage
  } finally {
    transferring.value = false
  }
}

async function importWorkbook(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  const grid = spreadsheet
  if (!file || !grid) return
  if (dirty.value && !window.confirm(CONFIRM_REPLACE)) return

  await withTransfer(async () => {
    const { importXlsx } = await import('./noovy-xlsx')
    const sheets = importXlsx(await file.arrayBuffer())
    if (!sheets.length) throw new Error('Classeur vide')
    grid.loadData(sheets)
    title.value = file.name.replace(/\.xlsx$/i, '')
    remoteId.value = null
    detachRemoteWorkbook()
    refresh()
    status.value = 'Classeur importé. Enregistrez pour le conserver.'
  }, 'Impossible d’importer ce fichier Excel.')
}

async function exportWorkbook() {
  const grid = spreadsheet
  if (!grid) return
  await withTransfer(async () => {
    const { exportXlsx } = await import('./noovy-xlsx')
    exportXlsx(grid.getData(), title.value)
  }, 'Impossible d’exporter le classeur.')
}

/** Exporte la feuille active en CSV (une seule feuille par fichier). */
async function exportCsv() {
  const grid = spreadsheet
  if (!grid) return
  await withTransfer(async () => {
    const { downloadCsv, toCsv } = await import('./services/csvExport')
    const sheets = grid.getData() as unknown as GridSheet[]
    const datas = (grid as unknown as { datas?: unknown[] }).datas ?? []
    const index = datas.indexOf((grid.sheet as unknown as { data: unknown }).data)
    const sheet = sheets[index >= 0 ? index : 0]
    if (!sheet) throw new Error('Feuille indisponible')
    downloadCsv(toCsv(sheet), title.value, sheet.name)
    status.value = `Feuille « ${sheet.name} » exportée en CSV.`
  }, 'Impossible d’exporter cette feuille en CSV.')
}
</script>

<template>
  <header class="noovy-header">
    <div class="noovy-topbar">
      <div class="noovy-brand">
        <img class="noovy-mark" src="/logo.png" alt="" width="34" height="34" aria-hidden="true">
        <span class="noovy-wordmark">Noovy<span class="noovy-word-grid">Grid</span></span>
      </div>
      <span class="noovy-divider" aria-hidden="true"></span>
      <input v-model="title" class="noovy-title" size="4" aria-label="Nom du classeur" placeholder="Feuille sans titre" @input="refresh" @keydown.stop @paste.stop @copy.stop @cut.stop>
      <span class="noovy-status" role="status">{{ statusText }}</span>
      <div v-if="ready" ref="menuHost" class="noovy-menu">
        <input ref="fileInput" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden @change="importWorkbook">
        <button ref="menuButton" class="noovy-menu-trigger" type="button" aria-haspopup="menu" aria-label="Fichier" :aria-expanded="menuOpen" @click="toggleMenu">
          <svg class="noovy-menu-icon" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1.8 4.6h4l1.3 1.6h7.1v6.4a1 1 0 0 1-1 1H2.8a1 1 0 0 1-1-1z" /><path d="M1.8 7.4h12.4" /></svg>
          <span class="noovy-menu-label">Fichier</span>
        </button>
        <div v-if="menuOpen" class="noovy-dropdown" role="menu" aria-label="Fichier">
          <button class="noovy-dropdown-item" role="menuitem" type="button" :disabled="saving || transferring" @click="runMenuAction(() => fileInput?.click())">Importer un fichier .xlsx</button>
          <button class="noovy-dropdown-item" role="menuitem" type="button" :disabled="transferring" @click="runMenuAction(exportWorkbook)">Exporter en .xlsx</button>
          <button class="noovy-dropdown-item" role="menuitem" type="button" :disabled="transferring" @click="runMenuAction(exportCsv)">Exporter la feuille en CSV</button>
          <span class="noovy-dropdown-sep" role="separator"></span>
          <button class="noovy-dropdown-item" role="menuitem" type="button" :disabled="saving || transferring" @click="runMenuAction(saveWorkbook)">Enregistrer</button>
        </div>
      </div>
      <div v-if="ready" class="noovy-actions">
        <button
          class="noovy-mode"
          type="button"
          :aria-pressed="quickOpen"
          :aria-label="quickOpen ? 'Masquer les actions rapides' : 'Afficher les actions rapides'"
          :title="quickOpen ? 'Masquer les actions rapides' : 'Afficher les actions rapides'"
          @click="toggleQuick"
        >
          <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M9.3 1.4 3.4 8.9h3.4L6.6 14.6l6-7.5H9.1z" /></svg>
        </button>
        <button
          class="noovy-design"
          type="button"
          :aria-pressed="premium"
          :aria-label="premium ? 'Désactiver les fonctions premium' : 'Activer les fonctions premium'"
          :title="premium ? 'Désactiver les fonctions premium' : 'Activer les fonctions premium'"
          @click="toggleDesign"
        >
          <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" aria-hidden="true">
            <path d="M8 2l1.3 3.2L12.5 6.5 9.3 7.8 8 11 6.7 7.8 3.5 6.5l3.2-1.3z" />
            <path d="M12.4 10.2l.5 1.2 1.2.5-1.2.5-.5 1.2-.5-1.2-1.2-.5 1.2-.5z" />
          </svg>
          <span class="noovy-design-label">Premium</span>
        </button>
        <button type="button" :disabled="saving || transferring" @click="saveWorkbook">Enregistrer</button>
      </div>
      <button v-else-if="status !== LOADING_MESSAGE" type="button" @click="loadWorkbook">Réessayer</button>
    </div>
  </header>
  <main ref="container" class="spreadsheet" aria-label="Tableur">
    <div class="noovy-ans" :class="{ show: quickAnswer }" role="status">
      <h4>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M10 3l1.9 5.1L17 10l-5.1 1.9L10 17l-1.9-5.1L3 10l5.1-1.9zM18 13l.9 2.1L21 16l-2.1.9L18 19l-.9-2.1L15 16l2.1-.9z" /></svg>
        Explication
      </h4>
      <p>{{ quickAnswerText }}</p>
      <button type="button" aria-label="Fermer" @click="quickAnswer = false">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
    </div>
    <div class="noovy-ctx" :class="{ show: quickOpen, finding: quickFind }" role="toolbar" aria-label="Actions sur la sélection">
      <div class="acts">
        <button class="ai" type="button" @click="explainCell">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M10 3l1.9 5.1L17 10l-5.1 1.9L10 17l-1.9-5.1L3 10l5.1-1.9zM18 13l.9 2.1L21 16l-2.1.9L18 19l-.9-2.1L15 16l2.1-.9z" /></svg>
          Expliquer
        </button>
        <button type="button" @click="insertRowBelow">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="6" rx="1.5" /><path d="M12 14v6M9 17h6" /></svg>
          Insérer une ligne
        </button>
        <button type="button" @click="startFind">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6" /><path d="M20 20l-4.2-4.2" /></svg>
          Chercher
        </button>
      </div>
      <form class="find" @submit.prevent="findNext">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6" /><path d="M20 20l-4.2-4.2" /></svg>
        <input ref="quickInput" v-model="quickQuery" :class="{ miss: quickMiss }" type="text" placeholder="Chercher dans la feuille" aria-label="Chercher dans la feuille" enterkeyhint="search" autocomplete="off" @input="findFrom = null">
        <button type="button" aria-label="Fermer la recherche" @click="closeFind">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </form>
    </div>
    <div v-if="groupCount > 1" class="noovy-groups" aria-hidden="true">
      <span v-for="index in groupCount" :key="index" :class="{ on: index - 1 === groupIndex }" />
    </div>
  </main>
  <Teleport v-if="formulaHost" :to="formulaHost">
    <form class="noovy-formula" @submit.prevent="applyFormula" @keydown.stop @paste.stop @copy.stop @cut.stop>
      <input :value="address" aria-label="Cellule active" readonly>
      <span aria-hidden="true">fx</span>
      <input v-model="formula" @keydown.enter.prevent="applyFormula" aria-label="Contenu de la cellule active" placeholder="Saisir une valeur ou une formule" :disabled="!address">
    </form>
  </Teleport>
  <Teleport v-if="statsHost" :to="statsHost">
    <div v-if="selectionStats" class="noovy-stats">
      <span>Somme : {{ formatNumber.format(selectionStats.total) }}</span>
      <span>Moyenne : {{ formatNumber.format(selectionStats.total / selectionStats.count) }}</span>
      <span>Nombre : {{ selectionStats.count }}</span>
    </div>
  </Teleport>
  <div v-if="premium && paletteOpen" class="noovy-veil" @mousedown.self="closePalette">
    <div class="noovy-pal" role="dialog" aria-modal="true" aria-label="Chercher ou agir">
      <input
        ref="paletteInput"
        v-model="paletteQuery"
        type="text"
        placeholder="Que voulez-vous faire ?"
        autocomplete="off"
        aria-label="Chercher une action"
        @input="paletteIndex = 0"
        @keydown="onPaletteKey"
      >
      <ul>
        <li v-for="(command, index) in commands" :key="command.id" :class="{ on: index === paletteIndex }">
          <button type="button" @click="runCommand(command.id)" @mouseenter="paletteIndex = index">
            <span>{{ command.label }}</span><small>{{ command.group }}</small>
          </button>
        </li>
      </ul>
      <p v-if="!commands.length" class="noovy-pal-empty">Aucune action ne correspond.</p>
    </div>
  </div>
  <aside v-if="premium" class="noovy-drawer" :class="{ open: explainOpen }" aria-label="Détail de la cellule" :aria-hidden="!explainOpen" :inert="explainOpen ? undefined : true">
    <button class="noovy-drawer-close" type="button" @click="explainOpen = false">Fermer</button>
    <h2>{{ address }} · {{ sheetName || 'Feuille' }}</h2>
    <p class="sub">{{ selectionStats ? 'Sélection multiple' : 'Cellule active' }}</p>
    <div class="formula">{{ formula || 'Cellule vide' }}</div>
    <div class="src"><span>Affiché</span><span>{{ renderedCell || '—' }}</span></div>
    <template v-if="selectionStats">
      <div class="src"><span>Somme</span><span>{{ formatNumber.format(selectionStats.total) }}</span></div>
      <div class="src"><span>Moyenne</span><span>{{ formatNumber.format(selectionStats.total / selectionStats.count) }}</span></div>
      <div class="src"><span>Nombre</span><span>{{ selectionStats.count }}</span></div>
    </template>
  </aside>
</template>
