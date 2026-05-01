<template>
  <div v-if="show" class="datepicker-modal" @click.self="close">
    <div class="datepicker-container" :style="positionStyle">
      <div class="datepicker-header">
        <button class="nav-btn" @click="prevMonth">&lt;</button>
        <span class="month-year">{{ currentMonthYear }}</span>
        <button class="nav-btn" @click="nextMonth">&gt;</button>
      </div>
      <div class="datepicker-weekdays">
        <span v-for="day in weekdays" :key="day" class="weekday">{{ day }}</span>
      </div>
      <div class="datepicker-days">
        <span
          v-for="date in calendarDays"
          :key="date.key"
          class="day"
          :class="{
            'other-month': !date.currentMonth,
            'selected': isSelected(date.date),
            'today': isToday(date.date)
          }"
          @click="selectDate(date.date)"
        >
          {{ date.day }}
        </span>
      </div>
      <div class="datepicker-footer">
        <button class="btn-text" @click="selectToday">Aujourd'hui</button>
        <button class="btn-text" @click="close">Annuler</button>
        <button class="btn-primary" @click="confirm">OK</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface Props {
  show: boolean
  modelValue?: string
  position?: { left: number; top: number }
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: string]
  'close': []
  'confirm': [value: string]
}>()

const currentDate = ref(new Date())
const selectedDate = ref<string>(props.modelValue || '')

const weekdays = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

const positionStyle = computed(() => {
  if (props.position) {
    return {
      left: `${props.position.left}px`,
      top: `${props.position.top}px`
    }
  }
  return {}
})

const currentMonthYear = computed(() => {
  const options: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' }
  return currentDate.value.toLocaleDateString('fr-FR', options)
})

const calendarDays = computed(() => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()
  
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDayOfWeek = firstDay.getDay()
  
  const days: { key: string; date: Date; day: number; currentMonth: boolean }[] = []
  
  // Previous month days
  const prevMonthLastDay = new Date(year, month, 0).getDate()
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const day = prevMonthLastDay - i
    days.push({
      key: `prev-${day}`,
      date: new Date(year, month - 1, day),
      day,
      currentMonth: false
    })
  }
  
  // Current month days
  for (let day = 1; day <= lastDay.getDate(); day++) {
    days.push({
      key: `curr-${day}`,
      date: new Date(year, month, day),
      day,
      currentMonth: true
    })
  }
  
  // Next month days
  const remainingCells = 42 - days.length
  for (let day = 1; day <= remainingCells; day++) {
    days.push({
      key: `next-${day}`,
      date: new Date(year, month + 1, day),
      day,
      currentMonth: false
    })
  }
  
  return days
})

function prevMonth() {
  currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() - 1, 1)
}

function nextMonth() {
  currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() + 1, 1)
}

function isSelected(date: Date): boolean {
  if (!selectedDate.value) return false
  const selected = new Date(selectedDate.value)
  return date.toDateString() === selected.toDateString()
}

function isToday(date: Date): boolean {
  return date.toDateString() === new Date().toDateString()
}

function selectDate(date: Date) {
  selectedDate.value = date.toISOString().split('T')[0]
}

function selectToday() {
  selectedDate.value = new Date().toISOString().split('T')[0]
  currentDate.value = new Date()
}

function close() {
  emit('close')
}

function confirm() {
  if (selectedDate.value) {
    emit('confirm', selectedDate.value)
    emit('update:modelValue', selectedDate.value)
  }
  emit('close')
}

watch(() => props.modelValue, (newVal) => {
  selectedDate.value = newVal || ''
})
</script>

<style scoped>
.datepicker-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  background: transparent;
}

.datepicker-container {
  position: absolute;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 12px;
  min-width: 280px;
}

.datepicker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}

.nav-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
  font-size: 14px;
  color: #666;
  border-radius: 4px;
}

.nav-btn:hover {
  background: #f5f5f5;
}

.month-year {
  font-weight: 500;
  font-size: 14px;
  color: #333;
  text-transform: capitalize;
}

.datepicker-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 8px;
}

.weekday {
  text-align: center;
  font-size: 11px;
  color: #999;
  padding: 4px;
}

.datepicker-days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.day {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  cursor: pointer;
  border-radius: 4px;
  color: #333;
}

.day:hover {
  background: #f0f0f0;
}

.day.other-month {
  color: #ccc;
}

.day.selected {
  background: #4b89ff;
  color: white;
}

.day.today {
  border: 1px solid #4b89ff;
}

.datepicker-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px solid #f0f0f0;
}

.btn-text {
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px 12px;
  font-size: 12px;
  color: #666;
  border-radius: 4px;
}

.btn-text:hover {
  background: #f5f5f5;
}

.btn-primary {
  background: #4b89ff;
  border: none;
  cursor: pointer;
  padding: 6px 16px;
  font-size: 12px;
  color: white;
  border-radius: 4px;
}

.btn-primary:hover {
  background: #3a78ee;
}
</style>
