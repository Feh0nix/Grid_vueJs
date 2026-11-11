<template>
  <div v-if="show" class="overlay" @click.self="$emit('close')" @keydown.esc="$emit('close')">
    <section class="dialog" role="dialog" aria-modal="true" aria-labelledby="conditional-title">
      <header><div><h2 id="conditional-title">Mise en forme conditionnelle</h2><p>Colorez les cellules selon leur contenu.</p></div><button type="button" aria-label="Fermer" @click="$emit('close')">×</button></header>
      <div class="body">
        <div v-if="rules.length" class="rules"><h3>Règles de la feuille</h3><div v-for="rule in rules" :key="rule.id" class="rule"><span class="swatch" :style="{ background: rule.backgroundColor, color: rule.color }">Aa</span><div><strong>{{ describe(rule) }}</strong><small>{{ rangeText(rule.range) }}</small></div><button type="button" @click="edit(rule)">Modifier</button><button type="button" :aria-label="`Supprimer ${describe(rule)}`" @click="$emit('remove', rule.id)">×</button></div></div>
        <form @submit.prevent="save">
          <div class="form-heading"><h3>{{ editingId ? 'Modifier la règle' : 'Nouvelle règle' }}</h3><button v-if="editingId" type="button" @click="reset">Nouvelle règle</button></div>
          <p class="hint">Plage : {{ editingId ? editingRange : selectionLabel }}</p>
          <label>Condition<select v-model="operator"><option value="greater">Supérieur à</option><option value="less">Inférieur à</option><option value="between">Compris entre</option><option value="contains">Le texte contient</option></select></label>
          <label>{{ operator === 'contains' ? 'Texte recherché' : operator === 'between' ? 'Minimum' : 'Valeur' }}<input :value="value" @input="value = ($event.target as HTMLInputElement).value" :type="operator === 'contains' ? 'text' : 'number'" step="any" required /></label>
          <label v-if="operator === 'between'">Maximum<input :value="value2" @input="value2 = ($event.target as HTMLInputElement).value" type="number" step="any" required /></label>
          <div class="colors"><label>Fond<input v-model="backgroundColor" type="color" /></label><label>Texte<input v-model="color" type="color" /></label><span :style="{ background: backgroundColor, color }">Aperçu</span></div>
          <p v-if="error" class="error" role="alert">{{ error }}</p>
          <div class="actions"><button type="button" @click="$emit('close')">Fermer</button><button type="submit" class="primary">{{ editingId ? 'Enregistrer' : 'Ajouter la règle' }}</button></div>
        </form>
        <p class="note">Les règles sont sauvegardées dans ce navigateur. Elles ne sont pas encore incluses dans l’export XLSX.</p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { CellRange, ConditionalFormatRule } from '../types/spreadsheet'
import { indexToColumn } from '../utils/helpers'

const props = defineProps<{ show: boolean; rules: ConditionalFormatRule[]; selection: CellRange | null }>()
const emit = defineEmits<{ close: []; save: [rule: Omit<ConditionalFormatRule, 'id' | 'range'>, id?: string]; remove: [id: string] }>()
const editingId = ref<string | null>(null)
const operator = ref<ConditionalFormatRule['operator']>('greater')
const value = ref(''), value2 = ref(''), backgroundColor = ref('#c6efce'), color = ref('#006100'), error = ref('')
const rangeText = (r: CellRange) => `${indexToColumn(r.sci)}${r.sri}:${indexToColumn(r.eci)}${r.eri}`
const selectionLabel = computed(() => props.selection ? rangeText(props.selection) : 'Aucune sélection')
const editingRange = computed(() => { const r = props.rules.find(rule => rule.id === editingId.value)?.range; return r ? rangeText(r) : '' })
const describe = (rule: ConditionalFormatRule) => rule.operator === 'contains' ? `Contient « ${rule.value} »` : rule.operator === 'between' ? `Entre ${rule.value} et ${rule.value2}` : `${rule.operator === 'greater' ? 'Supérieur' : 'Inférieur'} à ${rule.value}`
function reset() { editingId.value = null; operator.value = 'greater'; value.value = ''; value2.value = ''; backgroundColor.value = '#c6efce'; color.value = '#006100'; error.value = '' }
function edit(rule: ConditionalFormatRule) { editingId.value = rule.id; operator.value = rule.operator; value.value = rule.value; value2.value = rule.value2 || ''; backgroundColor.value = rule.backgroundColor; color.value = rule.color; error.value = '' }
watch(() => props.show, show => { if (show) reset() })
function save() {
  if (!value.value.trim()) { error.value = 'Saisissez une valeur.'; return }
  if (operator.value !== 'contains' && !Number.isFinite(Number(value.value))) { error.value = 'Saisissez un nombre valide.'; return }
  if (operator.value === 'between' && (!value2.value.trim() || !Number.isFinite(Number(value2.value)) || Number(value.value) > Number(value2.value))) { error.value = 'Le maximum doit être supérieur ou égal au minimum.'; return }
  emit('save', { operator: operator.value, value: value.value, value2: operator.value === 'between' ? value2.value : undefined, backgroundColor: backgroundColor.value, color: color.value }, editingId.value || undefined)
  reset()
}
</script>

<style scoped>
.overlay { position: fixed; inset: 0; display: grid; place-items: center; z-index: 1100; background: #0007; }.dialog { width: min(520px, 94vw); max-height: 90vh; overflow: auto; background: white; color: #26352b; border-radius: 8px; box-shadow: 0 16px 50px #0003; } header { padding: 16px 20px; display: flex; justify-content: space-between; align-items: start; border-bottom: 1px solid #e0e8e2; } header button { font-size: 22px; line-height: 1; } h2 { font-size: 16px; font-weight: 650; } header p,.hint,.note { font-size: 12px; color: #6b7a70; margin-top: 4px; }.body { padding: 16px 20px; font-size: 13px; } h3 { font-weight: 600; margin-bottom: 8px; } .rules { margin-bottom: 18px; } .rule { display: flex; align-items: center; gap: 10px; padding: 7px 0; border-bottom: 1px solid #edf1ee; } .rule div { flex: 1; min-width: 0; } .rule strong { display: block; font-size: 12px; overflow-wrap: anywhere; } .rule small { color: #6b7a70; } .rule button,.form-heading button { color: #107c41; } .swatch { padding: 5px; border-radius: 3px; } .form-heading { display: flex; justify-content: space-between; } label { display: grid; gap: 5px; margin-top: 10px; } input:not([type=color]),select { width: 100%; padding: 7px 8px; border: 1px solid #acb9af; border-radius: 4px; background: white; } .colors { display: flex; gap: 16px; align-items: end; } .colors input { width: 42px; height: 30px; } .colors span { padding: 6px 10px; border-radius: 3px; } .actions { display: flex; justify-content: end; gap: 8px; margin-top: 16px; }.actions button { padding: 7px 10px; border-radius: 4px; }.primary { background: #107c41; color: white; }.error { color: #b3261e; margin-top: 8px; }.note { margin-top: 16px; }
</style>
