// ============================================================================
// TRANSPORT HTTP
// Seule couche qui parle reseau. Ne connait pas le tableur.
// ============================================================================

import type { ApiErrorBody } from '../types/api'

/** Base de l'API, sans slash final. */
export const apiBaseUrl = (import.meta.env.VITE_API_URL ?? '').trim().replace(/\/+$/, '')

/** Vrai si une URL d'API est configuree. */
export const isApiConfigured = apiBaseUrl.length > 0

const DEFAULT_TIMEOUT = 15000
const configuredTimeout = Number(import.meta.env.VITE_API_TIMEOUT)
const timeoutMs = Number.isFinite(configuredTimeout) && configuredTimeout > 0 ? configuredTimeout : DEFAULT_TIMEOUT

const TOKEN_STORAGE_KEY = 'noovy-auth-token'

/** Erreur normalisee : toujours affichable dans l'interface. */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly body?: ApiErrorBody

  constructor(message: string, status: number, code: string, body?: ApiErrorBody) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.body = body
  }
}

/**
 * Jeton JWT : conserve en memoire, avec un miroir localStorage pour survivre
 * au rechargement. Branche sur l'ecran de connexion quand il existera.
 */
export const authToken = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY)
    } catch {
      return null
    }
  },
  set(token: string | null): void {
    try {
      if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token)
      else localStorage.removeItem(TOKEN_STORAGE_KEY)
    } catch {
      /* stockage indisponible : le jeton reste absent */
    }
  },
  clear(): void {
    this.set(null)
  },
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface RequestOptions {
  method?: HttpMethod
  body?: unknown
  signal?: AbortSignal
}

function normalisePath(path: string): string {
  return path.startsWith('/') ? path : '/' + path
}

/** Code et message par defaut pour chaque statut HTTP connu. */
const HTTP_STATUS: Record<number, { code: string; message: string }> = {
  400: { code: 'BAD_REQUEST', message: 'La requete a ete refusee.' },
  401: { code: 'UNAUTHORIZED', message: 'Session expiree : reconnectez-vous.' },
  403: { code: 'FORBIDDEN', message: 'Acces refuse a ce classeur.' },
  404: { code: 'NOT_FOUND', message: 'Ressource introuvable.' },
  409: { code: 'CONFLICT', message: 'La requete a echoue.' },
}

const SERVER_ERROR = { code: 'SERVER', message: 'Le serveur a rencontre une erreur.' }
const UNKNOWN_ERROR = { code: 'HTTP_ERROR', message: 'La requete a echoue.' }

function statusInfo(status: number): { code: string; message: string } {
  return HTTP_STATUS[status] ?? (status >= 500 ? SERVER_ERROR : UNKNOWN_ERROR)
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

/**
 * Primitive unique de transport, typee generique.
 * Objets renvoyes directement a la racine (pas d'enveloppe { data }).
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!isApiConfigured) {
    throw new ApiError('VITE_API_URL n’est pas configuree.', 0, 'CONFIG')
  }

  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)
  const forwardAbort = () => controller.abort()
  options.signal?.addEventListener('abort', forwardAbort, { once: true })

  const headers: Record<string, string> = { Accept: 'application/json' }
  const token = authToken.get()
  if (token) headers.Authorization = `Bearer ${token}`
  const hasBody = options.body !== undefined
  if (hasBody) headers['Content-Type'] = 'application/json'

  let response: Response
  try {
    response = await fetch(apiBaseUrl + normalisePath(path), {
      method: options.method ?? 'GET',
      headers,
      body: hasBody ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    })
  } catch (error) {
    if (options.signal?.aborted) throw new ApiError('Requete annulee.', 0, 'ABORTED')
    if (timedOut) throw new ApiError('Le serveur met trop de temps a repondre.', 0, 'TIMEOUT')
    if (error instanceof ApiError) throw error
    throw new ApiError('Impossible de joindre le serveur.', 0, 'NETWORK')
  } finally {
    clearTimeout(timer)
    options.signal?.removeEventListener('abort', forwardAbort)
  }

  if (response.status === 204) return undefined as T

  const text = await response.text()
  const payload = text ? parseJson(text) : undefined

  if (!response.ok) {
    const body = payload && typeof payload === 'object' ? (payload as ApiErrorBody) : undefined
    const fallback = statusInfo(response.status)
    const message = typeof body?.message === 'string' && body.message.trim() ? body.message.trim() : fallback.message
    if (response.status === 401) authToken.clear()
    throw new ApiError(message, response.status, body?.code ?? fallback.code, body)
  }

  return payload as T
}

/** Message affichable pour n'importe quelle erreur. */
export function describeError(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error && error.message) return error.message
  return 'Une erreur inattendue est survenue.'
}
