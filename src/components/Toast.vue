<template>
  <div class="toast-container">
    <transition-group name="toast">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="toast"
        :class="toast.type"
      >
        <span class="toast-icon">
          <Icons :name="getIconName(toast.type)" />
        </span>
        <span class="toast-message">{{ toast.message }}</span>
        <button class="toast-close" @click="remove(toast.id)">
          <Icons name="x" />
        </button>
      </div>
    </transition-group>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Icons from './Icons.vue'

interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  duration: number
}

const toasts = ref<Toast[]>([])
let nextId = 1

function getIconName(type: Toast['type']): string {
  switch (type) {
    case 'success': return 'check'
    case 'error': return 'x'
    case 'warning': return 'alert'
    case 'info': return 'info'
    default: return 'info'
  }
}

function add(message: string, type: Toast['type'] = 'info', duration = 3000) {
  const toast: Toast = {
    id: nextId++,
    message,
    type,
    duration
  }
  toasts.value.push(toast)
  
  setTimeout(() => {
    remove(toast.id)
  }, duration)
}

function remove(id: number) {
  const index = toasts.value.findIndex(t => t.id === id)
  if (index > -1) {
    toasts.value.splice(index, 1)
  }
}

// Expose methods for external use
defineExpose({
  add,
  remove,
  success: (message: string, duration?: number) => add(message, 'success', duration),
  error: (message: string, duration?: number) => add(message, 'error', duration),
  warning: (message: string, duration?: number) => add(message, 'warning', duration),
  info: (message: string, duration?: number) => add(message, 'info', duration)
})
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.toast {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: white;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 280px;
  max-width: 400px;
  border-left: 4px solid;
}

.toast.success {
  border-left-color: #4caf50;
}

.toast.error {
  border-left-color: #f44336;
}

.toast.warning {
  border-left-color: #ff9800;
}

.toast.info {
  border-left-color: #2196f3;
}

.toast-icon {
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
}

.toast.success .toast-icon {
  color: #4caf50;
}

.toast.error .toast-icon {
  color: #f44336;
}

.toast.warning .toast-icon {
  color: #ff9800;
}

.toast.info .toast-icon {
  color: #2196f3;
}

.toast-message {
  flex: 1;
  font-size: 13px;
  color: #333;
  line-height: 1.4;
}

.toast-close {
  background: none;
  border: none;
  cursor: pointer;
  color: #999;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  flex-shrink: 0;
}

.toast-close:hover {
  background: #f5f5f5;
  color: #333;
}

/* Transitions */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>
