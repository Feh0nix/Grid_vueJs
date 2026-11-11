<template>
  <aside class="chart-panel" aria-label="Graphiques de la feuille">
    <header><div><span class="eyebrow">FEUILLE DE CALCUL</span><h2>Graphiques</h2></div><button type="button" aria-label="Fermer les graphiques" @click="$emit('close')">×</button></header>
    <template v-if="chart">
      <label v-if="charts.length > 1">Graphique
        <select :value="chart.id" @change="$emit('select', ($event.target as HTMLSelectElement).value)">
          <option v-for="item in charts" :key="item.id" :value="item.id">{{ item.title }}</option>
        </select>
      </label>
      <label>Titre<input :value="chart.title" maxlength="80" @change="$emit('update', chart.id, { title: ($event.target as HTMLInputElement).value.trim() || 'Graphique' })" /></label>
      <label>Type<select :value="chart.type" @change="$emit('update', chart.id, { type: ($event.target as HTMLSelectElement).value as ChartDefinition['type'] })"><option value="column">Colonnes</option><option value="line">Courbes</option></select></label>
      <p class="source">Source : {{ rangeLabel }}</p>
      <div v-if="!data.series.length || !data.labels.length" class="empty">Aucune donnée numérique dans la plage sélectionnée.</div>
      <figure v-else>
        <figcaption>{{ chart.title }}</figcaption>
        <svg viewBox="0 0 420 260" role="img" :aria-label="`${chart.title}, ${data.series.length} série(s) et ${data.labels.length} catégorie(s)`">
          <g v-for="tick in ticks" :key="tick.value"><line x1="52" x2="408" :y1="tick.y" :y2="tick.y" stroke="#e3e9e4" /><text x="46" :y="tick.y + 4" text-anchor="end" class="axis-label">{{ formatNumber(tick.value) }}</text></g>
          <line x1="52" x2="408" :y1="zeroY" :y2="zeroY" stroke="#85988a" />
          <template v-for="(series, seriesIndex) in data.series" :key="series.name + seriesIndex">
            <template v-if="chart.type === 'column'"><rect v-for="(value, i) in series.values" v-show="value !== null" :key="i" :x="barX(i, seriesIndex)" :y="value === null ? zeroY : Math.min(scaleY(value), zeroY)" :width="barWidth" :height="value === null ? 0 : Math.max(1, Math.abs(scaleY(value) - zeroY))" :fill="colors[seriesIndex % colors.length]"><title>{{ data.labels[i] }} · {{ series.name }} : {{ value }}</title></rect></template>
            <template v-else><path :d="linePath(series.values)" fill="none" :stroke="colors[seriesIndex % colors.length]" stroke-width="2.5" /><circle v-for="(value, i) in series.values" v-show="value !== null" :key="i" :cx="pointX(i)" :cy="value === null ? 0 : scaleY(value)" r="2.5" :fill="colors[seriesIndex % colors.length]"><title>{{ data.labels[i] }} · {{ series.name }} : {{ value }}</title></circle></template>
          </template>
          <text v-for="label in axisLabels" :key="label.index" :x="pointX(label.index)" y="238" text-anchor="middle" class="axis-label">{{ label.text }}</text>
        </svg>
        <div class="legend"><span v-for="(series, i) in data.series" :key="series.name + i"><i :style="{ background: colors[i % colors.length] }"></i>{{ series.name }}</span></div>
        <details><summary>Données du graphique</summary><table><thead><tr><th>Catégorie</th><th v-for="(series, i) in data.series" :key="i">{{ series.name }}</th></tr></thead><tbody><tr v-for="(label, row) in data.labels" :key="row"><th>{{ label }}</th><td v-for="(series, i) in data.series" :key="i">{{ series.values[row] ?? '—' }}</td></tr></tbody></table></details>
      </figure>
      <p class="note">Les graphiques sont sauvegardés dans ce navigateur et ne sont pas encore inclus dans le fichier XLSX.</p>
      <button class="delete" type="button" @click="$emit('remove', chart.id)">Supprimer le graphique</button>
    </template>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CellData, ChartDefinition } from '../types/spreadsheet'
import type { FormulaContext } from '../composables/useFormula'
import { buildChartData } from '../utils/chartData'
import { indexToColumn } from '../utils/helpers'

const props = defineProps<{ charts: ChartDefinition[]; chart: ChartDefinition | undefined; cells: Record<string, CellData>; context: FormulaContext }>()
defineEmits<{ close: []; select: [id: string]; update: [id: string, changes: Partial<Pick<ChartDefinition, 'title' | 'type'>>]; remove: [id: string] }>()
const colors = ['#107c41', '#2766b0', '#d88a1a', '#a9457a', '#7957a3', '#008e93', '#b45535', '#64766b']
const data = computed(() => props.chart ? buildChartData(props.cells, props.chart.range, props.context) : { labels: [], series: [] })
const rangeLabel = computed(() => { const r = props.chart?.range; return r ? `${indexToColumn(r.sci)}${r.sri}:${indexToColumn(r.eci)}${r.eri}` : '' })
const bounds = computed(() => { const values = data.value.series.flatMap(series => series.values.filter((value): value is number => value !== null)); const min = Math.min(0, ...values), max = Math.max(0, ...values); return { min, max: min === max ? min + 1 : max } })
const scaleY = (value: number) => 210 - (value - bounds.value.min) / (bounds.value.max - bounds.value.min) * 180
const zeroY = computed(() => scaleY(0))
const pointX = (index: number) => 52 + (index + 0.5) * 356 / Math.max(1, data.value.labels.length)
const barWidth = computed(() => Math.max(0.5, 356 / Math.max(1, data.value.labels.length) * 0.8 / Math.max(1, data.value.series.length)))
const barX = (index: number, series: number) => pointX(index) - barWidth.value * data.value.series.length / 2 + barWidth.value * series
const linePath = (values: (number | null)[]) => { let drawing = false; return values.map((value, index) => { if (value === null) { drawing = false; return '' }; const segment = `${drawing ? 'L' : 'M'}${pointX(index)} ${scaleY(value)}`; drawing = true; return segment }).join(' ') }
const ticks = computed(() => Array.from({ length: 4 }, (_, i) => { const value = bounds.value.min + (bounds.value.max - bounds.value.min) * i / 3; return { value, y: scaleY(value) } }))
const axisLabels = computed(() => data.value.labels.map((text, index) => ({ text: text.length > 12 ? text.slice(0, 11) + '…' : text, index })).filter(item => item.index % Math.max(1, Math.ceil(data.value.labels.length / 6)) === 0))
const formatNumber = (value: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2, notation: 'compact' }).format(value)
</script>

<style scoped>
.chart-panel { flex: 0 0 360px; min-width: 0; overflow-y: auto; padding: 16px; background: #fff; border-left: 1px solid #d9e2dc; color: #26352b; font-size: 12px; } header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px; } header button { font-size: 22px; line-height: 1; } h2 { font-size: 17px; font-weight: 650; } .eyebrow { color: #708277; font-size: 10px; letter-spacing: .08em; } label { display: grid; gap: 4px; margin-bottom: 10px; color: #536359; } input, select { width: 100%; border: 1px solid #c1ccc4; border-radius: 4px; padding: 6px 8px; color: #26352b; background: white; } .source, .note { color: #68776d; margin: 10px 0; } figure { margin: 12px 0; border: 1px solid #e3eae5; border-radius: 6px; padding: 12px 8px; } figcaption { text-align: center; font-weight: 600; font-size: 14px; } svg { width: 100%; height: auto; } .axis-label { fill: #6e7f73; font-size: 10px; } .legend { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px 14px; } .legend span { display: flex; align-items: center; gap: 5px; } .legend i { width: 10px; height: 10px; border-radius: 2px; } details { margin: 12px 4px 0; overflow: auto; } summary { cursor: pointer; color: #107c41; } table { width: 100%; border-collapse: collapse; margin-top: 8px; } th, td { padding: 4px; border-bottom: 1px solid #e5ebe6; text-align: left; } .empty { padding: 24px 10px; background: #f5f8f6; text-align: center; } .delete { color: #a52a23; padding: 7px 0; } .delete:hover { text-decoration: underline; } @media (max-width: 760px) { .chart-panel { position: absolute; right: 0; top: 0; bottom: 0; z-index: 110; width: min(360px, 94%); box-shadow: -4px 0 16px #0002; } }
</style>
