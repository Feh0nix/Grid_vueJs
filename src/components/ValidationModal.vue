<template>
  <div v-if="show" class="overlay" @click.self="$emit('close')" @keydown.esc="$emit('close')">
    <form class="dialog" role="dialog" aria-modal="true" aria-labelledby="validation-title" @submit.prevent="save">
      <header><h2 id="validation-title">Validation des données</h2><button type="button" aria-label="Fermer" @click="$emit('close')">×</button></header>
      <div class="body">
        <p>La règle s’applique aux cellules sélectionnées et est incluse dans l’export XLSX. Les listes exportées doivent contenir au maximum 253 caractères, sans virgule ni guillemet.</p>
        <label>Type de règle
          <select v-model="type">
            <option value="number">Nombre</option><option value="text">Longueur du texte</option>
            <option value="date">Date</option><option value="list">Liste de valeurs</option>
          </select>
        </label>
        <template v-if="type !== 'list'">
          <p v-if="type === 'date'">Saisissez les dates dans la grille au format AAAA-MM-JJ.</p>
          <label>Minimum (facultatif)<input v-model="min" :type="type === 'date' ? 'date' : 'number'" :step="type === 'text' ? 1 : 'any'" /></label>
          <label>Maximum (facultatif)<input v-model="max" :type="type === 'date' ? 'date' : 'number'" :step="type === 'text' ? 1 : 'any'" /></label>
        </template>
        <label v-else>Valeurs autorisées, une par ligne<textarea v-model="list" rows="4" placeholder="Oui&#10;Non"></textarea></label>
        <label>Message d’erreur (facultatif)<input v-model="message" type="text" /></label>
        <label v-if="type === 'number'" class="check"><input v-model="integer" type="checkbox" /> Nombres entiers uniquement</label>
        <label class="check"><input v-model="allowBlank" type="checkbox" /> Autoriser une valeur vide</label>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
      </div>
      <footer><button type="button" class="remove" @click="$emit('clear')">Supprimer la règle</button><span></span><button type="button" @click="$emit('close')">Annuler</button><button class="primary" type="submit">Appliquer</button></footer>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { ValidationRule } from '../types/spreadsheet'

const props = defineProps<{ show: boolean; rule?: ValidationRule }>()
const emit = defineEmits<{ close: []; save: [rule: ValidationRule]; clear: [] }>()
const type = ref<'number' | 'text' | 'date' | 'list'>('number')
const min = ref(''), max = ref(''), list = ref(''), message = ref(''), error = ref('')
const allowBlank = ref(true)
const integer = ref(false)
watch(() => props.show, show => {
  if (!show) return
  const rule = props.rule
  type.value = rule && ['number', 'text', 'date', 'list'].includes(rule.type) ? rule.type as typeof type.value : 'number'
  min.value = rule?.min == null ? '' : String(rule.min)
  max.value = rule?.max == null ? '' : String(rule.max)
  list.value = rule?.values?.join('\n') || ''
  message.value = rule?.message || ''
  allowBlank.value = rule?.allowBlank !== false
  integer.value = !!rule?.integer
  error.value = ''
})
function save() {
  const values = list.value.split(/\r?\n/).map(value => value.trim()).filter(Boolean)
  if (type.value === 'list' && !values.length) { error.value = 'Ajoutez au moins une valeur.'; return }
  if (type.value !== 'list' && min.value && max.value && (type.value === 'date' ? min.value > max.value : Number(min.value) > Number(max.value))) { error.value = 'Le minimum doit être inférieur ou égal au maximum.'; return }
  if (type.value === 'text' && [min.value, max.value].some(value => value !== '' && (!Number.isInteger(Number(value)) || Number(value) < 0))) { error.value = 'La longueur doit être un entier positif ou nul.'; return }
  emit('save', { type: type.value, min: min.value === '' || type.value === 'list' ? undefined : type.value === 'date' ? min.value : Number(min.value), max: max.value === '' || type.value === 'list' ? undefined : type.value === 'date' ? max.value : Number(max.value), values: type.value === 'list' ? values : undefined, message: message.value.trim() || undefined, allowBlank: allowBlank.value, integer: type.value === 'number' && integer.value || undefined })
}
</script>

<style scoped>
.overlay { position: fixed; inset: 0; display: grid; place-items: center; background: #0007; z-index: 1100; }
.dialog { width: min(440px, 92vw); max-height: 90vh; overflow: auto; background: white; border-radius: 8px; color: #242b26; box-shadow: 0 16px 50px #0003; }
header, footer { display: flex; align-items: center; gap: 8px; padding: 16px 20px; }
header { justify-content: space-between; border-bottom: 1px solid #e0e5e1; } h2 { font-size: 16px; font-weight: 600; }
header button { font-size: 22px; line-height: 1; } .body { padding: 16px 20px; display: grid; gap: 12px; font-size: 13px; }
.body p { color: #56635a; } label { display: grid; gap: 5px; } input:not([type=checkbox]), select, textarea { width: 100%; padding: 7px 8px; border: 1px solid #acb9af; border-radius: 4px; background: white; }
.check { display: flex; align-items: center; gap: 8px; } .error { color: #b3261e !important; }
footer { border-top: 1px solid #e0e5e1; font-size: 13px; } footer span { flex: 1; } footer button { padding: 7px 10px; border-radius: 4px; } footer button:hover { background: #e8eeea; } footer .primary { color: white; background: #107c41; } footer .primary:hover { background: #0a6333; } .remove { color: #9a3129; }
</style>
