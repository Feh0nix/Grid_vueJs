// ============================================================================
// TRANSPORT HTTP
// Seule couche qui parle reseau. Ne connait pas le tableur.
// ============================================================================

/** Base de l'API, sans slash final. */
export const apiBaseUrl = (import.meta.env.VITE_API_URL ?? '').trim().replace(/\/+$/, '')

/** Vrai si une URL d'API est configuree. */
export const isApiConfigured = apiBaseUrl.length > 0

const DEFAULT_TIMEOUT = 15000
const configuredTimeout = Number(import.meta.env.VITE_API_TIMEOUT)
const timeoutMs = Number.isFinite(configuredTimeout) && configuredTimeout > 0 ? configuredTimeout : DEFAULT_TIMEOUT

/** Erreur normalisee : message affichable, statut 0 si reseau ou configuration. */
export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status = 0) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
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

/** Message de repli par statut HTTP ; le serveur peut le remplacer. */
const STATUS_MESSAGES: Record<number, string> = {
  400: 'La requete a ete refusee.',
  401: 'Session expiree : reconnectez-vous.',
  403: 'Acces refuse a ce classeur.',
  404: 'Ressource introuvable.',
}

function fallbackMessage(status: number): string {
  if (STATUS_MESSAGES[status]) return STATUS_MESSAGES[status]
  return status >= 500 ? 'Le serveur a rencontre une erreur.' : 'La requete a echoue.'
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

/** Message d'erreur fourni par le serveur (`{ "message": "..." }`), sinon null. */
function serverMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null
  const message = (payload as { message?: unknown }).message
  return typeof message === 'string' && message.trim() ? message.trim() : null
}

/**
 * Primitive unique de transport, typee generique.
 * Objets renvoyes directement a la racine (pas d'enveloppe { data }).
 * Le delai maximal couvre l'ensemble de l'echange, corps de reponse inclus.
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!isApiConfigured) throw new ApiError('VITE_API_URL n’est pas configuree.')
  if (options.signal?.aborted) throw new ApiError('Requete annulee.')

  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)
  const forwardAbort = () => controller.abort()
  options.signal?.addEventListener('abort', forwardAbort, { once: true })

  const headers: Record<string, string> = { Accept: 'application/json' }
  const hasBody = options.body !== undefined
  if (hasBody) headers['Content-Type'] = 'application/json'

  let response: Response
  let text: string
  try {
    response = await fetch(apiBaseUrl + normalisePath(path), {
      method: options.method ?? 'GET',
      headers,
      body: hasBody ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    })
    text = await response.text()
  } catch {
    if (options.signal?.aborted) throw new ApiError('Requete annulee.')
    if (timedOut) throw new ApiError('Le serveur met trop de temps a repondre.')
    throw new ApiError('Impossible de joindre le serveur.')
  } finally {
    clearTimeout(timer)
    options.signal?.removeEventListener('abort', forwardAbort)
  }

  const payload = text ? parseJson(text) : undefined

  if (!response.ok) {
    throw new ApiError(serverMessage(payload) ?? fallbackMessage(response.status), response.status)
  }

  return payload as T
}

/** Message affichable pour n'importe quelle erreur. */
export function describeError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  return 'Une erreur inattendue est survenue.'
}
