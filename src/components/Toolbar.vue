<template>
  <div class="flex flex-col bg-gs-bg-secondary border-b border-gs-border-light dark:bg-gs-dark-surface dark:border-gs-border-dark">
    <!-- Top Menu Bar -->
    <div class="flex items-center px-3 py-1.5 bg-gs-bg-primary border-b border-gs-border dark:bg-gs-dark-bg dark:border-gs-border-dark">
      <BaseButton variant="secondary" size="xs" icon="menu" @click="showFileMenu = !showFileMenu">
        Fichier
      </BaseButton>
      <div class="flex-1"></div>
      <ThemeToggle />
    </div>

    <!-- Main Toolbar - Google Sheets Style -->
    <nav class="flex items-center gap-1 px-3 py-1.5 flex-wrap min-h-[44px]">
      <!-- Section 1: Undo/Redo/Print/Paint Format -->
      <div class="flex items-center gap-0.5">
        <BaseTooltip content="Annuler (Ctrl+Z)">
          <BaseButton variant="ghost" size="sm" icon="undo" :disabled="!canUndo" @click="$emit('undo')" />
        </BaseTooltip>
        <BaseTooltip content="Refaire (Ctrl+Y)">
          <BaseButton variant="ghost" size="sm" icon="redo" :disabled="!canRedo" @click="$emit('redo')" />
        </BaseTooltip>
        <BaseTooltip content="Imprimer (Ctrl+P)">
          <BaseButton variant="ghost" size="sm" icon="print" @click="$emit('print')" />
        </BaseTooltip>
        <BaseTooltip content="Reproduire la mise en forme">
          <BaseButton variant="ghost" size="sm" icon="paint-bucket" :active="paintFormatActive" @click="$emit('paintFormat')" />
        </BaseTooltip>
      </div>

      <ToolbarDivider />

      <!-- Section 2: Font Size & Format -->
      <div class="flex items-center gap-0.5">
        <select
          class="h-8 px-2 text-sm bg-white border border-gs-border-light rounded-gs focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 w-14 dark:bg-gs-dark-surface dark:border-gs-border-dark dark:text-gs-dark-text-primary"
          :value="currentFormat.fontSize || 11"
          @change="$emit('formatChange', { fontSize: Number(($event.target as HTMLSelectElement).value) })"
        >
          <option v-for="size in fontSizes" :key="size" :value="size">{{ size }}</option>
        </select>
        <BaseTooltip content="Gras (Ctrl+B)">
          <BaseButton variant="ghost" size="sm" :active="currentFormat.bold" @click="$emit('formatChange', { bold: !currentFormat.bold })">
            <span class="font-bold text-sm">B</span>
          </BaseButton>
        </BaseTooltip>
        <BaseTooltip content="Italique (Ctrl+I)">
          <BaseButton variant="ghost" size="sm" :active="currentFormat.italic" @click="$emit('formatChange', { italic: !currentFormat.italic })">
            <span class="italic text-sm font-serif">I</span>
          </BaseButton>
        </BaseTooltip>
        <BaseTooltip content="Souligné (Ctrl+U)">
          <BaseButton variant="ghost" size="sm" :active="currentFormat.underline" @click="$emit('formatChange', { underline: !currentFormat.underline })">
            <span class="underline text-sm">U</span>
          </BaseButton>
        </BaseTooltip>
        <BaseTooltip content="Barré">
          <BaseButton variant="ghost" size="sm" :active="currentFormat.strikethrough" @click="$emit('formatChange', { strikethrough: !currentFormat.strikethrough })">
            <span class="line-through text-sm">S</span>
          </BaseButton>
        </BaseTooltip>
      </div>

      <ToolbarDivider />

      <!-- Section 3: Borders & Fill -->
      <div class="flex items-center gap-0.5">
        <!-- Borders Dropdown -->
        <div class="relative">
          <BaseTooltip content="Bordures">
            <BaseButton variant="ghost" size="sm" @click="showBordersMenu = !showBordersMenu">
              <BaseIcon name="border-all" :size="16" />
              <BaseIcon name="chevron-down" :size="10" class="-ml-0.5" />
            </BaseButton>
          </BaseTooltip>
          <Transition name="dropdown">
            <div v-if="showBordersMenu" class="absolute top-full left-0 mt-1 bg-white border border-gs-border-light rounded-gs shadow-dropdown z-50 min-w-[180px] py-1 dark:bg-gs-dark-surface dark:border-gs-border-dark">
              <div class="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gs-bg-tertiary text-sm text-gs-text-primary dark:text-gs-dark-text-primary dark:hover:bg-gs-dark-elevated" @click="$emit('borders', 'all'); showBordersMenu = false">
                <BaseIcon name="border-all" :size="18" />
                <span>Toutes les bordures</span>
              </div>
              <div class="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gs-bg-tertiary text-sm text-gs-text-primary dark:text-gs-dark-text-primary dark:hover:bg-gs-dark-elevated" @click="$emit('borders', 'outside'); showBordersMenu = false">
                <BaseIcon name="border-outside" :size="18" />
                <span>Bordure extérieure</span>
              </div>
              <div class="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gs-bg-tertiary text-sm text-gs-text-primary dark:text-gs-dark-text-primary dark:hover:bg-gs-dark-elevated" @click="$emit('borders', 'none'); showBordersMenu = false">
                <BaseIcon name="border-none" :size="18" />
                <span>Aucune bordure</span>
              </div>
            </div>
          </Transition>
        </div>

        <!-- Fill Color -->
        <BaseTooltip content="Couleur de remplissage">
          <div class="relative group">
            <BaseButton variant="ghost" size="sm">
              <BaseIcon name="paint-bucket" :size="16" />
              <div class="w-4 h-0.5 mt-0.5 rounded-sm border border-gs-border-light" :style="{ backgroundColor: currentFormat.backgroundColor || 'transparent' }"></div>
            </BaseButton>
            <input
              type="color"
              class="absolute inset-0 opacity-0 cursor-pointer"
              :value="currentFormat.backgroundColor || '#ffffff'"
              @change="$emit('formatChange', { backgroundColor: ($event.target as HTMLInputElement).value })"
            >
          </div>
        </BaseTooltip>

        <!-- Font Color -->
        <BaseTooltip content="Couleur de police">
          <div class="relative group">
            <BaseButton variant="ghost" size="sm">
              <span class="text-sm font-bold font-serif" :style="{ color: currentFormat.color || '#000' }">A</span>
              <div class="w-4 h-0.5 mt-0.5 rounded-sm border border-gs-border-light" :style="{ backgroundColor: currentFormat.color || '#000' }"></div>
            </BaseButton>
            <input
              type="color"
              class="absolute inset-0 opacity-0 cursor-pointer"
              :value="currentFormat.color || '#000000'"
              @change="$emit('formatChange', { color: ($event.target as HTMLInputElement).value })"
            >
          </div>
        </BaseTooltip>
      </div>

      <ToolbarDivider />

      <!-- Section 4: Alignment -->
      <div class="flex items-center gap-0.5">
        <BaseTooltip content="Aligner à gauche">
          <BaseButton variant="ghost" size="sm" :active="currentFormat.align === 'left' || !currentFormat.align" @click="$emit('formatChange', { align: 'left' })">
            <BaseIcon name="align-left" :size="16" />
          </BaseButton>
        </BaseTooltip>
        <BaseTooltip content="Centrer">
          <BaseButton variant="ghost" size="sm" :active="currentFormat.align === 'center'" @click="$emit('formatChange', { align: 'center' })">
            <BaseIcon name="align-center" :size="16" />
          </BaseButton>
        </BaseTooltip>
        <BaseTooltip content="Aligner à droite">
          <BaseButton variant="ghost" size="sm" :active="currentFormat.align === 'right'" @click="$emit('formatChange', { align: 'right' })">
            <BaseIcon name="align-right" :size="16" />
          </BaseButton>
        </BaseTooltip>
        <BaseTooltip content="Justifier">
          <BaseButton variant="ghost" size="sm" :active="currentFormat.verticalAlign === 'middle'" @click="$emit('formatChange', { verticalAlign: 'middle' })">
            <BaseIcon name="align-justify" :size="16" />
          </BaseButton>
        </BaseTooltip>
        <BaseTooltip content="Retour à la ligne">
          <BaseButton variant="ghost" size="sm" :active="currentFormat.textwrap" @click="$emit('textwrap')">
            <BaseIcon name="wrap-text" :size="16" />
          </BaseButton>
        </BaseTooltip>
        <BaseTooltip content="Fusionner et centrer">
          <BaseButton variant="ghost" size="sm" :active="isMergeActive" @click="$emit('mergeCells')">
            <BaseIcon name="merge" :size="16" />
          </BaseButton>
        </BaseTooltip>
      </div>

      <ToolbarDivider />

      <!-- Section 5: Number Format -->
      <div class="flex items-center gap-0.5">
        <BaseTooltip content="Format monétaire (€)">
          <BaseButton variant="ghost" size="sm" @click="$emit('currencyFormat')">
            <span class="text-base font-semibold">€</span>
          </BaseButton>
        </BaseTooltip>
        <BaseTooltip content="Format pourcentage (%)">
          <BaseButton variant="ghost" size="sm" @click="$emit('percentageFormat')">
            <BaseIcon name="percent" :size="16" />
          </BaseButton>
        </BaseTooltip>
        <BaseTooltip content="Format nombre">
          <BaseButton variant="ghost" size="sm" @click="$emit('numberFormat')">
            <span class="text-xs font-semibold">.0</span>
            <BaseIcon name="chevron-down" :size="10" class="ml-0.5" />
          </BaseButton>
        </BaseTooltip>
      </div>

      <ToolbarDivider />

      <!-- Section 6: Insert & Functions -->
      <div class="flex items-center gap-0.5">
        <div class="relative">
          <BaseTooltip content="Insérer">
            <BaseButton variant="ghost" size="sm" @click="showInsertMenu = !showInsertMenu">
              <BaseIcon name="plus" :size="16" />
              <BaseIcon name="chevron-down" :size="10" class="-ml-0.5" />
            </BaseButton>
          </BaseTooltip>
          <Transition name="dropdown">
            <div v-if="showInsertMenu" class="absolute top-full left-0 mt-1 bg-white border border-gs-border-light rounded-gs shadow-dropdown z-50 min-w-[160px] py-1 dark:bg-gs-dark-surface dark:border-gs-border-dark">
              <div class="px-3 py-2 cursor-pointer hover:bg-gs-bg-tertiary text-sm text-gs-text-primary dark:text-gs-dark-text-primary dark:hover:bg-gs-dark-elevated" @click="$emit('insertFunction'); showInsertMenu = false">
                <span class="italic font-serif">fx</span> Fonction
              </div>
              <div class="px-3 py-2 cursor-pointer hover:bg-gs-bg-tertiary text-sm text-gs-text-primary dark:text-gs-dark-text-primary dark:hover:bg-gs-dark-elevated" @click="$emit('insertChart'); showInsertMenu = false">
                Graphique
              </div>
              <div class="px-3 py-2 cursor-pointer hover:bg-gs-bg-tertiary text-sm text-gs-text-primary dark:text-gs-dark-text-primary dark:hover:bg-gs-dark-elevated" @click="$emit('insertImage'); showInsertMenu = false">
                Image
              </div>
              <div class="px-3 py-2 cursor-pointer hover:bg-gs-bg-tertiary text-sm text-gs-text-primary dark:text-gs-dark-text-primary dark:hover:bg-gs-dark-elevated" @click="$emit('insertLink'); showInsertMenu = false">
                Lien
              </div>
            </div>
          </Transition>
        </div>

        <div class="relative">
          <BaseTooltip content="Fonctions">
            <BaseButton variant="ghost" size="sm" @click="showFunctionsMenu = !showFunctionsMenu">
              <span class="text-xs font-semibold italic font-serif">∑</span>
              <BaseIcon name="chevron-down" :size="10" class="ml-0.5" />
            </BaseButton>
          </BaseTooltip>
          <Transition name="dropdown">
            <div v-if="showFunctionsMenu" class="absolute top-full left-0 mt-1 bg-white border border-gs-border-light rounded-gs shadow-dropdown z-50 min-w-[140px] py-1 dark:bg-gs-dark-surface dark:border-gs-border-dark">
              <div class="px-3 py-2 cursor-pointer hover:bg-gs-bg-tertiary text-sm text-gs-text-primary dark:text-gs-dark-text-primary dark:hover:bg-gs-dark-elevated" @click="$emit('formulaHelp'); showFunctionsMenu = false">
                Aide formules
              </div>
              <div class="h-px bg-gs-border-light my-1 dark:bg-gs-border-dark"></div>
              <div class="px-3 py-2 cursor-pointer hover:bg-gs-bg-tertiary text-sm text-gs-text-primary dark:text-gs-dark-text-primary dark:hover:bg-gs-dark-elevated" @click="$emit('insertFunction', 'SUM'); showFunctionsMenu = false">
                SOMME
              </div>
              <div class="px-3 py-2 cursor-pointer hover:bg-gs-bg-tertiary text-sm text-gs-text-primary dark:text-gs-dark-text-primary dark:hover:bg-gs-dark-elevated" @click="$emit('insertFunction', 'AVERAGE'); showFunctionsMenu = false">
                MOYENNE
              </div>
              <div class="px-3 py-2 cursor-pointer hover:bg-gs-bg-tertiary text-sm text-gs-text-primary dark:text-gs-dark-text-primary dark:hover:bg-gs-dark-elevated" @click="$emit('insertFunction', 'MAX'); showFunctionsMenu = false">
                MAX
              </div>
              <div class="px-3 py-2 cursor-pointer hover:bg-gs-bg-tertiary text-sm text-gs-text-primary dark:text-gs-dark-text-primary dark:hover:bg-gs-dark-elevated" @click="$emit('insertFunction', 'MIN'); showFunctionsMenu = false">
                MIN
              </div>
            </div>
          </Transition>
        </div>
      </div>

      <ToolbarDivider />

      <!-- Section 7: Sort & Filter -->
      <div class="flex items-center gap-0.5">
        <BaseTooltip content="Trier A-Z">
          <BaseButton variant="ghost" size="sm" @click="$emit('sortAsc')">
            <BaseIcon name="sort-asc" :size="16" />
          </BaseButton>
        </BaseTooltip>
        <BaseTooltip content="Trier Z-A">
          <BaseButton variant="ghost" size="sm" @click="$emit('sortDesc')">
            <BaseIcon name="sort-desc" :size="16" />
          </BaseButton>
        </BaseTooltip>
        <BaseTooltip content="Filtrer">
          <BaseButton variant="ghost" size="sm" @click="$emit('autofilter')">
            <BaseIcon name="filter" :size="16" />
          </BaseButton>
        </BaseTooltip>
      </div>

      <ToolbarDivider />

      <!-- Section 8: More Tools -->
      <div class="flex items-center gap-0.5">
        <BaseTooltip content="Figer volets">
          <BaseButton variant="ghost" size="sm" @click="$emit('freeze')">
            <BaseIcon name="freeze" :size="16" />
          </BaseButton>
        </BaseTooltip>
        <BaseTooltip content="Effacer la mise en forme">
          <BaseButton variant="ghost" size="sm" @click="$emit('clearFormat')">
            <BaseIcon name="clear" :size="16" />
          </BaseButton>
        </BaseTooltip>
        <div class="relative">
          <BaseTooltip content="Plus d'options">
            <BaseButton variant="ghost" size="sm" @click="showMore = !showMore">
              <BaseIcon name="more-vertical" :size="16" />
            </BaseButton>
          </BaseTooltip>
          <Transition name="dropdown">
            <div v-if="showMore" class="absolute top-full right-0 mt-1 bg-white border border-gs-border-light rounded-gs shadow-dropdown z-50 min-w-[160px] py-1 dark:bg-gs-dark-surface dark:border-gs-border-dark">
              <div class="px-3 py-2 cursor-pointer hover:bg-gs-bg-tertiary text-sm text-gs-text-primary dark:text-gs-dark-text-primary dark:hover:bg-gs-dark-elevated" @click="$emit('exportCSV'); showMore = false">
                Exporter CSV
              </div>
              <div class="px-3 py-2 cursor-pointer hover:bg-gs-bg-tertiary text-sm text-gs-text-primary dark:text-gs-dark-text-primary dark:hover:bg-gs-dark-elevated" @click="$emit('exportXLSX'); showMore = false">
                Exporter XLSX
              </div>
              <div class="h-px bg-gs-border-light my-1 dark:bg-gs-border-dark"></div>
              <div class="px-3 py-2 cursor-pointer hover:bg-gs-bg-tertiary text-sm text-gs-text-primary dark:text-gs-dark-text-primary dark:hover:bg-gs-dark-elevated" @click="$emit('importCSV'); showMore = false">
                Importer CSV
              </div>
              <div class="px-3 py-2 cursor-pointer hover:bg-gs-bg-tertiary text-sm text-gs-text-primary dark:text-gs-dark-text-primary dark:hover:bg-gs-dark-elevated" @click="$emit('importXLSX'); showMore = false">
                Importer XLSX
              </div>
              <div class="h-px bg-gs-border-light my-1 dark:bg-gs-border-dark"></div>
              <div class="px-3 py-2 cursor-pointer hover:bg-gs-bg-tertiary text-sm text-gs-text-primary dark:text-gs-dark-text-primary dark:hover:bg-gs-dark-elevated" @click="$emit('share'); showMore = false">
                Partager
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </nav>

    <!-- File Menu -->
    <Transition name="dropdown">
      <div v-if="showFileMenu" class="absolute top-12 left-3 bg-white border border-gs-border-light rounded-gs shadow-dropdown z-[1001] min-w-[220px] py-1 dark:bg-gs-dark-surface dark:border-gs-border-dark">
        <div class="px-3 py-2 text-sm font-semibold text-primary-500 border-b border-gs-border-light mb-1 dark:border-gs-border-dark">
          Fichier
        </div>
        <div class="px-3 py-2 cursor-pointer hover:bg-gs-bg-tertiary text-sm text-gs-text-primary dark:text-gs-dark-text-primary dark:hover:bg-gs-dark-elevated" @click="$emit('exportCSV'); showFileMenu = false">
          Télécharger au format CSV
        </div>
        <div class="px-3 py-2 cursor-pointer hover:bg-gs-bg-tertiary text-sm text-gs-text-primary dark:text-gs-dark-text-primary dark:hover:bg-gs-dark-elevated" @click="$emit('exportXLSX'); showFileMenu = false">
          Télécharger au format XLSX
        </div>
        <div class="h-px bg-gs-border-light my-1 dark:bg-gs-border-dark"></div>
        <div class="px-3 py-2 cursor-pointer hover:bg-gs-bg-tertiary text-sm text-gs-text-primary dark:text-gs-dark-text-primary dark:hover:bg-gs-dark-elevated" @click="$emit('importCSV'); showFileMenu = false">
          Importer CSV
        </div>
        <div class="px-3 py-2 cursor-pointer hover:bg-gs-bg-tertiary text-sm text-gs-text-primary dark:text-gs-dark-text-primary dark:hover:bg-gs-dark-elevated" @click="$emit('importXLSX'); showFileMenu = false">
          Importer XLSX
        </div>
        <div class="h-px bg-gs-border-light my-1 dark:bg-gs-border-dark"></div>
        <div class="px-3 py-2 cursor-pointer hover:bg-gs-bg-tertiary text-sm text-gs-text-primary dark:text-gs-dark-text-primary dark:hover:bg-gs-dark-elevated" @click="$emit('print'); showFileMenu = false">
          Imprimer
        </div>
        <div class="h-px bg-gs-border-light my-1 dark:bg-gs-border-dark"></div>
        <div class="px-3 py-2 cursor-pointer hover:bg-gs-bg-tertiary text-sm text-gs-text-primary dark:text-gs-dark-text-primary dark:hover:bg-gs-dark-elevated" @click="$emit('share'); showFileMenu = false">
          Partager
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { CellFormat } from '../types/spreadsheet'
import BaseButton from './ui/BaseButton.vue'
import BaseIcon from './ui/BaseIcon.vue'
import BaseTooltip from './ui/BaseTooltip.vue'
import ThemeToggle from './ui/ThemeToggle.vue'
import ToolbarDivider from './ToolbarDivider.vue'

interface Props {
  spreadsheetName: string
  currentFormat: CellFormat
  canUndo: boolean
  canRedo: boolean
  zoom: number
  isFavorite: boolean
  isMergeActive: boolean
  paintFormatActive: boolean
}

defineProps<Props>()

defineEmits<{
  undo: []
  redo: []
  print: []
  paintFormat: []
  clearFormat: []
  zoomChange: [zoom: number]
  currencyFormat: []
  percentageFormat: []
  numberFormat: []
  formatChange: [format: Partial<CellFormat>]
  mergeCells: []
  borders: [type?: string]
  freeze: []
  autofilter: []
  textwrap: []
  share: []
  toggleFavorite: []
  formulaHelp: []
  exportCSV: []
  exportXLSX: []
  importCSV: []
  importXLSX: []
  sortAsc: []
  sortDesc: []
  insertFunction: [name?: string]
  insertChart: []
  insertImage: []
  insertLink: []
  insertComment: []
}>()

const fontSizes = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24]
const showMore = ref(false)
const showFileMenu = ref(false)
const showBordersMenu = ref(false)
const showInsertMenu = ref(false)
const showFunctionsMenu = ref(false)
</script>

<style scoped>
/* Dropdown transitions */
.dropdown-enter-active,
.dropdown-leave-active {
  @apply transition-all duration-150 ease-gs;
}

.dropdown-enter-from,
.dropdown-leave-to {
  @apply opacity-0 scale-95;
}
</style>
