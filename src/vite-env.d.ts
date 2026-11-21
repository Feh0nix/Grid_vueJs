/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface ImportMetaEnv {
  /** Base de l'API, sans slash final. */
  readonly VITE_API_URL?: string
  /** 'true' pour utiliser les donnees de demonstration locales. */
  readonly VITE_API_MOCK?: string
  /** Delai maximal d'une requete, en millisecondes. */
  readonly VITE_API_TIMEOUT?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
