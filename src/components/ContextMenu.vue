<template>
  <div
    v-if="show"
    class="context-menu"
    :style="{ left: position.x + 'px', top: position.y + 'px' }"
    @click.stop
  >
    <div class="menu-section">
      <div class="menu-item" @click="$emit('cut')">
        <span class="icon"><Icons name="cut" /></span> Couper
      </div>
      <div class="menu-item" @click="$emit('copy')">
        <span class="icon"><Icons name="copy" /></span> Copier
      </div>
      <div class="menu-item" @click="$emit('paste')">
        <span class="icon"><Icons name="paste" /></span> Coller
      </div>
    </div>
    
    <div class="menu-divider"></div>
    
    <div class="menu-section">
      <div class="menu-item" @click="$emit('merge')">
        <span class="icon"><Icons name="merge" /></span> Fusionner
      </div>
      <div class="menu-item" @click="$emit('unmerge')">
        <span class="icon"><Icons name="merge" /></span> Séparer
      </div>
    </div>
    
    <div class="menu-divider"></div>
    
    <div class="menu-section">
      <div class="menu-item" @click="$emit('insertRow')">
        <span class="icon"><Icons name="insertrow" /></span> Insérer ligne
      </div>
      <div class="menu-item" @click="$emit('insertCol')">
        <span class="icon"><Icons name="insertcol" /></span> Insérer colonne
      </div>
      <div class="menu-item" @click="$emit('deleteRow')">
        <span class="icon"><Icons name="deleterow" /></span> Supprimer ligne
      </div>
      <div class="menu-item" @click="$emit('deleteCol')">
        <span class="icon"><Icons name="deletecol" /></span> Supprimer colonne
      </div>
    </div>
    
    <div class="menu-divider"></div>
    
    <div class="menu-section">
      <div class="menu-item" @click="$emit('hideRow')">
        <span class="icon"><Icons name="hide" /></span> Masquer ligne
      </div>
      <div class="menu-item" @click="$emit('hideCol')">
        <span class="icon"><Icons name="hide" /></span> Masquer colonne
      </div>
      <div class="menu-item" @click="$emit('showAll')">
        <span class="icon"><Icons name="show" /></span> Afficher tout
      </div>
    </div>
    
    <div class="menu-divider"></div>
    
    <div class="menu-section">
      <div class="menu-item" @click="$emit('formatCells')">
        <span class="icon"><Icons name="paintformat" /></span> Format de cellule
      </div>
      <div class="menu-item" @click="$emit('validation')">
        <span class="icon"><Icons name="validation" /></span> Validation de données
      </div>
    </div>
    
    <div class="menu-divider"></div>
    
    <div class="menu-section">
      <div class="menu-item" @click="$emit('sortAsc')">
        <span class="icon"><Icons name="sortasc" /></span> Tri croissant
      </div>
      <div class="menu-item" @click="$emit('sortDesc')">
        <span class="icon"><Icons name="sortdesc" /></span> Tri décroissant
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Icons from './Icons.vue'

interface Position {
  x: number
  y: number
}

interface Props {
  show: boolean
  position: Position
}

defineProps<Props>()

defineEmits<{
  cut: []
  copy: []
  paste: []
  merge: []
  unmerge: []
  insertRow: []
  insertCol: []
  deleteRow: []
  deleteCol: []
  hideRow: []
  hideCol: []
  showAll: []
  formatCells: []
  validation: []
  sortAsc: []
  sortDesc: []
}>()
</script>
