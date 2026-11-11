<template>
  <footer class="flex items-center px-2 py-1 bg-gs-bg-secondary border-t border-gs-border-light gap-2 dark:bg-gs-dark-surface dark:border-gs-border-dark">
    <!-- Add Sheet Button -->
    <BaseTooltip content="Ajouter une feuille">
      <button
        class="w-7 h-7 flex items-center justify-center rounded-full border border-gs-border-light bg-gs-bg-primary text-gs-text-secondary hover:border-primary-500 hover:text-primary-500 transition-all duration-150 shrink-0 dark:bg-gs-dark-bg dark:border-gs-border-dark dark:text-gs-dark-text-secondary"
        @click="$emit('addSheet')"
      >
        <BaseIcon name="plus" :size="14" />
      </button>
    </BaseTooltip>

    <!-- Tabs Container -->
    <div class="flex gap-1 flex-1 overflow-x-auto scrollbar-thin">
      <div
        v-for="sheet in sheets"
        :key="sheet.id"
        class="group flex items-center px-3 py-1.5 bg-gs-bg-primary border border-gs-border-light border-b-0 rounded-t-gs cursor-pointer text-sm text-gs-text-secondary transition-all duration-150 min-w-[80px] relative hover:bg-gs-bg-tertiary dark:bg-gs-dark-bg dark:border-gs-border-dark dark:text-gs-dark-text-secondary dark:hover:bg-gs-dark-elevated"
        :class="{ 'sheet-active': sheet.id === activeSheetId }"
        @click="$emit('sheetChange', sheet.id)"
        @dblclick="startRename(sheet)"
      >
        <input v-if="editingId === sheet.id" v-model="draftName" class="sheet-name-input" aria-label="Renommer la feuille" maxlength="31" @click.stop @keydown.enter.stop.prevent="finishRename" @keydown.escape.stop.prevent="editingId = null" @blur="finishRename" />
        <span v-else class="flex-1">{{ sheet.name }}</span>
        <button
          v-if="sheets.length > 1"
          class="ml-1.5 w-3.5 h-3.5 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-70 hover:!opacity-100 hover:bg-black/10 transition-all"
          :class="{ 'hover:bg-white/20': sheet.id === activeSheetId }"
          @click.stop="$emit('deleteSheet', sheet.id)"
        >
          <BaseIcon name="x" :size="10" />
        </button>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { nextTick, ref } from 'vue'
import type { Sheet } from '../types/spreadsheet'
import BaseIcon from './ui/BaseIcon.vue'
import BaseTooltip from './ui/BaseTooltip.vue'

interface Props {
  sheets: Sheet[]
  activeSheetId: string
}

defineProps<Props>()

const emit = defineEmits<{
  sheetChange: [sheetId: string]
  addSheet: []
  deleteSheet: [sheetId: string]
  renameSheet: [sheetId: string, name: string]
}>()
const editingId = ref<string | null>(null)
const draftName = ref('')
function startRename(sheet: Sheet) {
  editingId.value = sheet.id
  draftName.value = sheet.name
  nextTick(() => document.querySelector<HTMLInputElement>('.sheet-name-input')?.select())
}
function finishRename() {
  if (!editingId.value) return
  emit('renameSheet', editingId.value, draftName.value)
  editingId.value = null
}
</script>

<style scoped>
.sheet-active { color: #107c41; border-bottom: 2px solid #107c41; font-weight: 600; background: #fff; }
.sheet-name-input { width: 110px; min-width: 40px; color: #222; background: white; outline: 1px solid #107c41; }
</style>
