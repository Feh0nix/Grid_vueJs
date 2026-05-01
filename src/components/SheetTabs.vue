<template>
  <footer class="excel-sheet-tabs">
    <button class="excel-add-sheet-btn" @click="$emit('addSheet')" title="Ajouter une feuille">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
      </svg>
    </button>

    <div class="excel-tabs-container">
      <div
        v-for="sheet in sheets"
        :key="sheet.id"
        class="excel-tab"
        :class="{ active: sheet.id === activeSheetId }"
        @click="$emit('sheetChange', sheet.id)"
      >
        <span class="excel-tab-name">{{ sheet.name }}</span>
        <button
          v-if="sheets.length > 1"
          class="excel-tab-close"
          @click.stop="$emit('deleteSheet', sheet.id)"
          title="Supprimer la feuille"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import type { Sheet } from '../types/spreadsheet'

interface Props {
  sheets: Sheet[]
  activeSheetId: string
}

defineProps<Props>()

defineEmits<{
  sheetChange: [sheetId: string]
  addSheet: []
  deleteSheet: [sheetId: string]
}>()
</script>

<style scoped>
.excel-sheet-tabs {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  background: #f8f9fa;
  border-top: 1px solid #dadce0;
  gap: 4px;
}

.excel-add-sheet-btn {
  width: 28px;
  height: 28px;
  border: 1px solid #dadce0;
  border-radius: 50%;
  background: white;
  color: #5f6368;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.excel-add-sheet-btn:hover {
  background: #e8eaed;
  border-color: #1a73e8;
  color: #1a73e8;
}

.excel-tabs-container {
  display: flex;
  gap: 4px;
  flex: 1;
  overflow-x: auto;
}

.excel-tab {
  display: flex;
  align-items: center;
  padding: 6px 12px;
  background: white;
  border: 1px solid #dadce0;
  border-bottom: none;
  border-radius: 4px 4px 0 0;
  cursor: pointer;
  font-size: 13px;
  color: #5f6368;
  transition: all 0.15s;
  position: relative;
  min-width: 80px;
}

.excel-tab:hover {
  background: #f1f3f4;
}

.excel-tab.active {
  background: #1a73e8;
  color: white;
  border-color: #1a73e8;
  font-weight: 500;
}

.excel-tab-name {
  flex: 1;
}

.excel-tab-close {
  margin-left: 6px;
  width: 14px;
  height: 14px;
  border: none;
  background: none;
  color: inherit;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.15s;
  border-radius: 50%;
}

.excel-tab:hover .excel-tab-close {
  opacity: 0.7;
}

.excel-tab-close:hover {
  opacity: 1 !important;
  background: rgba(0, 0, 0, 0.1);
}

.excel-tab.active .excel-tab-close:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>
