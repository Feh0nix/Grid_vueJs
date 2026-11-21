// ============================================================================
// SESSION DE CLASSEUR
// Orchestration entre le cache local (IndexedDB) et l'API : ouverture avec
// repli hors-ligne, enregistrement local puis distant, messages d'etat.
// App.vue ne garde que le cablage de l'interface.
// ============================================================================

import { readWorkbook, writeWorkbook } from '../noovy-storage'
import { ApiError, describeError, isApiConfigured } from './api'
import { isMockMode, readLastWorkbookId, rememberLastWorkbookId, workbookService } from './workbookService'
import type { WorkbookData, WorkbookPayload } from '../types/api'

const MESSAGES = {
  fromServer: 'Classeur chargé depuis le serveur.',
  fromDevice: 'Classeur chargé depuis cet appareil.',
  localOnly: (reason: string) => 'Mode local : ' + reason,
  brokenCache: 'le cache local est illisible.',
  savedOnServer: 'Classeur enregistré sur le serveur.',
  savedInMock: 'Classeur enregistré (mode démonstration).',
  savedLocally: (reason: string) => 'Enregistré sur cet appareil — ' + reason,
  saveFailed: (reason: string) => 'Échec de l’enregistrement. ' + reason,
} as const

export interface OpenedWorkbook {
  /** Contenu a afficher, ou undefined pour demarrer sur une grille vierge. */
  workbook?: WorkbookData
  remoteId: string | null
  /** Message d'etat a afficher une fois la grille montee. */
  status: string
  /** Vrai si le contenu vient du serveur et doit alimenter le cache local. */
  cacheFromServer: boolean
}

/**
 * Classeur distant a ouvrir : le dernier ouvert, sinon le plus recent.
 * Un 404 signifie que le classeur n'existe plus : on oublie son id.
 */
async function fetchRemoteWorkbook(): Promise<(WorkbookData & { id: string }) | null> {
  if (!isMockMode && !isApiConfigured) return null
  const service = await workbookService()
  let id = readLastWorkbookId()
  if (!id) {
    const summaries = await service.list()
    if (!summaries.length) return null
    id = summaries[0].id
  }
  try {
    const detail = await service.get(id)
    rememberLastWorkbookId(detail.id)
    return { id: detail.id, title: detail.title, sheets: detail.sheets as unknown as Record<string, unknown>[] }
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      rememberLastWorkbookId(null)
      return null
    }
    throw error
  }
}

/** Ouvre le classeur courant : serveur d'abord, cache local en repli. */
export async function openWorkbook(): Promise<OpenedWorkbook> {
  let remoteError = ''
  try {
    const remote = await fetchRemoteWorkbook()
    if (remote) {
      return {
        workbook: { title: remote.title, sheets: remote.sheets },
        remoteId: remote.id,
        status: MESSAGES.fromServer,
        cacheFromServer: true,
      }
    }
  } catch (error) {
    remoteError = describeError(error)
  }

  let workbook: WorkbookData | undefined
  try {
    const cached = await readWorkbook()
    if (cached) workbook = { title: cached.title, sheets: cached.sheets }
  } catch {
    if (!remoteError) remoteError = MESSAGES.brokenCache
  }

  return {
    workbook,
    remoteId: null,
    status: workbook ? (remoteError ? MESSAGES.localOnly(remoteError) : MESSAGES.fromDevice) : '',
    cacheFromServer: false,
  }
}

export interface SaveResult {
  remoteId: string | null
  status: string
  /** Vrai si les donnees ont ete ecrites quelque part (appareil ou serveur). */
  persisted: boolean
}

/** Ecrit sur l'appareil puis sur le serveur ; un echec distant ne perd rien. */
export async function persistWorkbook(payload: WorkbookPayload, remoteId: string | null): Promise<SaveResult> {
  let localSaved = false
  try {
    await writeWorkbook({ title: payload.title, sheets: payload.sheets })
    localSaved = true
  } catch {
    /* cache local indisponible : on tente quand meme le serveur */
  }

  try {
    const service = await workbookService()
    const detail = remoteId ? await service.update(remoteId, payload) : await service.create(payload)
    rememberLastWorkbookId(detail.id)
    return {
      remoteId: detail.id,
      status: isMockMode ? MESSAGES.savedInMock : MESSAGES.savedOnServer,
      persisted: true,
    }
  } catch (error) {
    const reason = describeError(error)
    return {
      remoteId,
      status: localSaved ? MESSAGES.savedLocally(reason) : MESSAGES.saveFailed(reason),
      persisted: localSaved,
    }
  }
}

/** Detache le classeur courant de son homologue distant (import de fichier). */
export function detachRemoteWorkbook(): void {
  rememberLastWorkbookId(null)
}

/** Recopie un classeur lu sur le serveur dans le cache local. */
export function cacheWorkbook(workbook: WorkbookData): void {
  void writeWorkbook({ title: workbook.title, sheets: workbook.sheets }).catch(() => {})
}
