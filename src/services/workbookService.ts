// ============================================================================
// SERVICE CLASSEURS
// Pont entre App.vue et l'API. Le format { title, sheets } de
// x-data-spreadsheet est transmis sans transformation.
// ============================================================================

import { request } from './api'
import type { GridSheet, WorkbookDetail, WorkbookPayload, WorkbookSummary } from '../types/api'

/** Contrat consomme par l'interface. */
export interface WorkbookService {
  list(): Promise<WorkbookSummary[]>
  get(id: string): Promise<WorkbookDetail>
  create(payload: WorkbookPayload): Promise<WorkbookDetail>
  update(id: string, payload: WorkbookPayload): Promise<WorkbookDetail>
  remove(id: string): Promise<void>
}

const mockFlag = import.meta.env.VITE_API_MOCK?.trim().toLowerCase()
/**
 * Mode demonstration : explicite par VITE_API_MOCK, sinon actif en
 * developpement et inactif dans un build de production.
 */
export const isMockMode = mockFlag ? mockFlag === 'true' : import.meta.env.DEV

function createRemoteService(): WorkbookService {
  const path = (id: string) => `/workbooks/${encodeURIComponent(id)}`
  return {
    list: () => request<WorkbookSummary[]>('/workbooks'),
    get: id => request<WorkbookDetail>(path(id)),
    create: (payload: WorkbookPayload) => request<WorkbookDetail>('/workbooks', { method: 'POST', body: payload }),
    update: (id: string, payload: WorkbookPayload) => request<WorkbookDetail>(path(id), { method: 'PUT', body: payload }),
    remove: id => request<void>(path(id), { method: 'DELETE' }),
  }
}

let instance: Promise<WorkbookService> | undefined

/** Renvoie le service actif (mock charge a la demande). */
export function workbookService(): Promise<WorkbookService> {
  instance ??= isMockMode
    ? import('./mockWorkbookApi').then(module => module.createMockWorkbookApi())
    : Promise.resolve(createRemoteService())
  return instance
}

/** Titre par defaut d'un classeur sans nom. */
export const DEFAULT_WORKBOOK_TITLE = 'Feuille sans titre'

/**
 * Construit le corps d'envoi a partir de l'etat du tableur.
 * getData() renvoie le format x-data-spreadsheet : conversion type only.
 */
export function toWorkbookPayload(title: string, sheets: Record<string, unknown>[]): WorkbookPayload {
  return { title: title.trim() || DEFAULT_WORKBOOK_TITLE, sheets: sheets as unknown as GridSheet[] }
}

const LAST_WORKBOOK_KEY = 'noovy-grid-last-workbook-id'

/** Dernier classeur distant ouvert, pour le recharger au demarrage. */
export function readLastWorkbookId(): string | null {
  try {
    return localStorage.getItem(LAST_WORKBOOK_KEY)
  } catch {
    return null
  }
}

export function rememberLastWorkbookId(id: string | null): void {
  try {
    if (id) localStorage.setItem(LAST_WORKBOOK_KEY, id)
    else localStorage.removeItem(LAST_WORKBOOK_KEY)
  } catch {
    /* stockage indisponible : la memoire de session suffit */
  }
}
