<template>
  <Teleport to="body">
    <div v-if="show" class="modal-overlay" @click="$emit('close')">
      <div class="modal-content" @click.stop>
        <header class="modal-header">
          <h2>Aide aux Formules</h2>
          <button class="close-btn" @click="$emit('close')">
            <Icons name="x" />
          </button>
        </header>
        
        <div class="formula-list">
          <div class="formula-category">
            <h3>Mathématiques</h3>
            <div class="formula-item">
              <code>SUM(range)</code>
              <span>Somme des valeurs</span>
            </div>
            <div class="formula-item">
              <code>AVERAGE(range)</code>
              <span>Moyenne</span>
            </div>
            <div class="formula-item">
              <code>COUNT(range)</code>
              <span>Nombre de cellules</span>
            </div>
            <div class="formula-item">
              <code>MAX(range)</code>
              <span>Valeur maximale</span>
            </div>
            <div class="formula-item">
              <code>MIN(range)</code>
              <span>Valeur minimale</span>
            </div>
            <div class="formula-item">
              <code>ROUND(number, decimals)</code>
              <span>Arrondi</span>
            </div>
            <div class="formula-item">
              <code>ABS(number)</code>
              <span>Valeur absolue</span>
            </div>
            <div class="formula-item">
              <code>SQRT(number)</code>
              <span>Racine carrée</span>
            </div>
            <div class="formula-item">
              <code>POWER(base, exp)</code>
              <span>Puissance</span>
            </div>
          </div>
          
          <div class="formula-category">
            <h3>Logiques</h3>
            <div class="formula-item">
              <code>IF(condition, vrai, faux)</code>
              <span>Condition</span>
            </div>
            <div class="formula-item">
              <code>AND(cond1, cond2, ...)</code>
              <span>ET logique</span>
            </div>
            <div class="formula-item">
              <code>OR(cond1, cond2, ...)</code>
              <span>OU logique</span>
            </div>
            <div class="formula-item">
              <code>NOT(condition)</code>
              <span>Négation</span>
            </div>
          </div>
          
          <div class="formula-category">
            <h3>Texte</h3>
            <div class="formula-item">
              <code>CONCAT(text1, text2, ...)</code>
              <span>Concaténation</span>
            </div>
            <div class="formula-item">
              <code>LEN(text)</code>
              <span>Longueur</span>
            </div>
            <div class="formula-item">
              <code>UPPER(text)</code>
              <span>Majuscules</span>
            </div>
            <div class="formula-item">
              <code>LOWER(text)</code>
              <span>Minuscules</span>
            </div>
            <div class="formula-item">
              <code>PROPER(text)</code>
              <span>Capitalisation</span>
            </div>
            <div class="formula-item">
              <code>LEFT(text, n)</code>
              <span>Caractères de gauche</span>
            </div>
            <div class="formula-item">
              <code>RIGHT(text, n)</code>
              <span>Caractères de droite</span>
            </div>
            <div class="formula-item">
              <code>MID(text, start, n)</code>
              <span>Sous-chaîne</span>
            </div>
            <div class="formula-item">
              <code>TRIM(text)</code>
              <span>Supprime espaces</span>
            </div>
          </div>
          
          <div class="formula-category">
            <h3>Date et Heure</h3>
            <div class="formula-item">
              <code>TODAY()</code>
              <span>Date du jour</span>
            </div>
            <div class="formula-item">
              <code>NOW()</code>
              <span>Date et heure actuelles</span>
            </div>
            <div class="formula-item">
              <code>YEAR(date)</code>
              <span>Année</span>
            </div>
            <div class="formula-item">
              <code>MONTH(date)</code>
              <span>Mois</span>
            </div>
            <div class="formula-item">
              <code>DAY(date)</code>
              <span>Jour</span>
            </div>
          </div>
        </div>
        
        <footer class="modal-footer">
          <button @click="$emit('close')" class="btn btn-primary">Fermer</button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import Icons from './Icons.vue'

defineProps<{
  show: boolean
}>()

defineEmits<{
  close: []
}>()
</script>

<style scoped>
.modal-overlay {
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
  backdrop-filter: blur(4px);
}

.modal-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 800px;
  max-height: 80vh;
  width: 90%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e0e0e0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.modal-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.close-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: rotate(90deg);
}

.formula-list {
  padding: 24px;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
}

.formula-category {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
}

.formula-category h3 {
  margin: 0 0 12px 0;
  color: #667eea;
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.formula-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #e0e0e0;
}

.formula-item:last-child {
  border-bottom: none;
}

.formula-item code {
  background: #e3f2fd;
  color: #1976d2;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-family: 'Monaco', 'Consolas', monospace;
}

.formula-item span {
  font-size: 13px;
  color: #666;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  justify-content: flex-end;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}
</style>
