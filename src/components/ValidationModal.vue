<template>
  <div v-if="show" class="validation-modal-overlay" @click.self="close">
    <div class="validation-modal">
      <div class="modal-header">
        <h3>Validation de données</h3>
        <button class="close-btn" @click="close">×</button>
      </div>
      
      <div class="modal-body">
        <div class="form-group">
          <label>Critère :</label>
          <select v-model="validation.type" class="form-select">
            <option value="">Aucune</option>
            <option value="number">Nombre</option>
            <option value="date">Date</option>
            <option value="list">Liste</option>
            <option value="text-length">Longueur du texte</option>
            <option value="custom">Formule personnalisée</option>
          </select>
        </div>
        
        <div v-if="validation.type === 'number'" class="form-group">
          <label>Condition :</label>
          <select v-model="validation.operator" class="form-select">
            <option value="between">Entre</option>
            <option value="not-between">Pas entre</option>
            <option value="equal">Égal à</option>
            <option value="not-equal">Différent de</option>
            <option value="greater">Supérieur à</option>
            <option value="less">Inférieur à</option>
            <option value="greater-equal">Supérieur ou égal</option>
            <option value="less-equal">Inférieur ou égal</option>
          </select>
        </div>
        
        <div v-if="validation.type === 'number'" class="form-row">
          <div class="form-group">
            <label>Valeur minimum :</label>
            <input v-model="validation.min" type="number" class="form-input" placeholder="Min">
          </div>
          <div class="form-group" v-if="validation.operator === 'between' || validation.operator === 'not-between'">
            <label>Valeur maximum :</label>
            <input v-model="validation.max" type="number" class="form-input" placeholder="Max">
          </div>
        </div>
        
        <div v-if="validation.type === 'date'" class="form-group">
          <label>Condition :</label>
          <select v-model="validation.dateOperator" class="form-select">
            <option value="between">Entre</option>
            <option value="equal">Égal à</option>
            <option value="greater">Après</option>
            <option value="less">Avant</option>
            <option value="today">Aujourd'hui</option>
          </select>
        </div>
        
        <div v-if="validation.type === 'list'" class="form-group">
          <label>Liste de valeurs (séparées par des virgules) :</label>
          <textarea v-model="validation.listValues" class="form-textarea" rows="3" placeholder="Valeur1, Valeur2, Valeur3"></textarea>
        </div>
        
        <div v-if="validation.type === 'text-length'" class="form-group">
          <label>Longueur :</label>
          <input v-model="validation.textLength" type="number" class="form-input" placeholder="Nombre de caractères">
        </div>
        
        <div v-if="validation.type === 'custom'" class="form-group">
          <label>Formule :</label>
          <input v-model="validation.formula" type="text" class="form-input" placeholder="=A1>0">
        </div>
        
        <div class="form-group">
          <label>Message d'erreur (optionnel) :</label>
          <input v-model="validation.errorMessage" type="text" class="form-input" placeholder="Valeur invalide">
        </div>
        
        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="validation.allowEmpty">
            <span>Autoriser les cellules vides</span>
          </label>
        </div>
      </div>
      
      <div class="modal-footer">
        <button class="btn-text" @click="clear">Effacer</button>
        <div class="btn-group">
          <button class="btn-secondary" @click="close">Annuler</button>
          <button class="btn-primary" @click="save">OK</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface ValidationRule {
  type: string
  operator?: string
  dateOperator?: string
  min?: number
  max?: number
  listValues?: string
  textLength?: number
  formula?: string
  errorMessage?: string
  allowEmpty: boolean
}

interface Props {
  show: boolean
  modelValue?: ValidationRule
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: ValidationRule]
  'close': []
  'save': [rule: ValidationRule]
  'clear': []
}>()

const defaultValidation: ValidationRule = {
  type: '',
  operator: 'between',
  dateOperator: 'equal',
  min: undefined,
  max: undefined,
  listValues: '',
  textLength: undefined,
  formula: '',
  errorMessage: '',
  allowEmpty: true
}

const validation = ref<ValidationRule>({ ...defaultValidation })

watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    validation.value = { ...defaultValidation, ...newVal }
  } else {
    validation.value = { ...defaultValidation }
  }
}, { immediate: true })

function save() {
  emit('save', validation.value)
  emit('update:modelValue', validation.value)
  close()
}

function clear() {
  validation.value = { ...defaultValidation }
  emit('clear')
  close()
}

function close() {
  emit('close')
}
</script>

<style scoped>
.validation-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.validation-modal {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  width: 400px;
  max-width: 90vw;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e0e0e0;
}

.modal-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 20px;
  color: #999;
  padding: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.close-btn:hover {
  background: #f5f5f5;
  color: #333;
}

.modal-body {
  padding: 20px;
  max-height: 60vh;
  overflow-y: auto;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 12px;
  color: #666;
  margin-bottom: 6px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.form-select,
.form-input,
.form-textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-size: 13px;
  color: #333;
  background: white;
  box-sizing: border-box;
}

.form-select:focus,
.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #4b89ff;
}

.form-textarea {
  resize: vertical;
  font-family: inherit;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
  color: #333;
}

.checkbox-label input {
  cursor: pointer;
}

.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  border-top: 1px solid #e0e0e0;
  background: #fafafa;
  border-radius: 0 0 8px 8px;
}

.btn-group {
  display: flex;
  gap: 8px;
}

.btn-text {
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px 16px;
  font-size: 13px;
  color: #666;
  border-radius: 4px;
}

.btn-text:hover {
  background: #f0f0f0;
}

.btn-secondary {
  background: white;
  border: 1px solid #e0e0e0;
  cursor: pointer;
  padding: 8px 16px;
  font-size: 13px;
  color: #333;
  border-radius: 4px;
}

.btn-secondary:hover {
  background: #f5f5f5;
}

.btn-primary {
  background: #4b89ff;
  border: none;
  cursor: pointer;
  padding: 8px 20px;
  font-size: 13px;
  color: white;
  border-radius: 4px;
}

.btn-primary:hover {
  background: #3a78ee;
}
</style>
