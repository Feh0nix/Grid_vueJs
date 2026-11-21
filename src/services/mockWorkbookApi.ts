// ============================================================================
// IMPLEMENTATION DE DEMONSTRATION
// Chargee uniquement quand VITE_API_MOCK vaut true (import dynamique),
// elle n'entre donc pas dans le bundle de production.
// ============================================================================

import { ApiError } from './api'
import type { GridSheet, WorkbookDetail, WorkbookPayload, WorkbookSummary } from '../types/api'
import type { WorkbookService } from './workbookService'

const STORAGE_KEY = 'noovy-mock-workbooks-v1'
const LATENCY_MS = 250

function nowIso(): string {
  return new Date().toISOString()
}

function generateId(): string {
  return 'wb_' + Math.random().toString(36).slice(2, 10)
}

function emptySheet(name: string): GridSheet {
  return { name, rows: { len: 100 }, cols: { len: 26 }, merges: [] }
}

function seed(): WorkbookDetail[] {
  const sheet = emptySheet('Budget')
  const values: Array<[number, number, string]> = [
    [0, 0, 'Poste'], [0, 1, 'Prevu'], [0, 2, 'Reel'],
    [1, 0, 'Loyer'], [1, 1, '850'], [1, 2, '850'],
    [2, 0, 'Courses'], [2, 1, '420'], [2, 2, '398'],
    [3, 0, 'Transport'], [3, 1, '120'], [3, 2, '134'],
    [5, 0, 'Total'], [5, 1, '=SUM(B2:B4)'], [5, 2, '=SUM(C2:C4)'],
  ]
  for (const [row, col, text] of values) {
    const target = (sheet.rows[row] ??= { cells: {} })
    target.cells[col] = { text }
  }
  const timestamp = nowIso()
  return [
    {
      id: generateId(),
      title: 'Classeur de demonstration',
      sheets: [sheet],
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ]
}

function read(): WorkbookDetail[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed as WorkbookDetail[]
    }
  } catch {
    /* storage illisible : on repart du jeu de demonstration */
  }
  // Persiste une seule fois : sans cela, chaque lecture regenererait des ids
  // differents et GET /workbooks/:id repondrait 404.
  const initial = seed()
  write(initial)
  return initial
}

function write(workbooks: WorkbookDetail[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workbooks))
  } catch {
    /* stockage indisponible : la demo reste en memoire */
  }
}

function toSummary(workbook: WorkbookDetail): WorkbookSummary {
  const { id, title, createdAt, updatedAt } = workbook
  return { id, title, createdAt, updatedAt }
}

function notFound(): ApiError {
  return new ApiError('Classeur introuvable.', 404)
}

/** Id reserve pour verifier l'etat d'erreur de l'interface. */
const FAILING_ID = 'erreur'

/** Reproduit l'echec serveur sur l'id de demonstration. */
function assertStable(id: string): void {
  if (id === FAILING_ID) throw new ApiError('Erreur simulee par le mode demonstration.', 500)
}

function findWorkbook(workbooks: WorkbookDetail[], id: string): WorkbookDetail {
  const workbook = workbooks.find(entry => entry.id === id)
  if (!workbook) throw notFound()
  return workbook
}

const delay = () => new Promise<void>(resolve => setTimeout(resolve, LATENCY_MS))

export function createMockWorkbookApi(): WorkbookService {
  return {
    async list() {
      await delay()
      return read()
        .slice()
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .map(toSummary)
    },

    async get(id: string) {
      await delay()
      assertStable(id)
      return findWorkbook(read(), id)
    },

    async create(payload: WorkbookPayload) {
      await delay()
      const timestamp = nowIso()
      const workbook: WorkbookDetail = {
        id: generateId(),
        title: payload.title,
        sheets: payload.sheets,
        createdAt: timestamp,
        updatedAt: timestamp,
      }
      write([workbook, ...read()])
      return workbook
    },

    async update(id: string, payload: WorkbookPayload) {
      await delay()
      assertStable(id)
      const workbooks = read()
      const index = workbooks.indexOf(findWorkbook(workbooks, id))
      const updated: WorkbookDetail = {
        ...workbooks[index],
        title: payload.title,
        sheets: payload.sheets,
        updatedAt: nowIso(),
      }
      workbooks[index] = updated
      write(workbooks)
      return updated
    },

    async remove(id: string) {
      await delay()
      assertStable(id)
      const workbooks = read()
      findWorkbook(workbooks, id)
      write(workbooks.filter(entry => entry.id !== id))
    },
  }
}
