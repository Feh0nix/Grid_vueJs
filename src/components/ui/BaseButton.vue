<template>
  <button
    :class="buttonClasses"
    :disabled="disabled || loading"
    @click="handleClick"
  >
    <span v-if="loading" class="btn-loading-indicator">
      <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
    </span>
    <span v-else-if="$slots.icon || icon" class="btn-icon">
      <slot name="icon">
        <BaseIcon v-if="icon" :name="icon" :size="iconSize" />
      </slot>
    </span>
    <span v-if="$slots.default" class="btn-content">
      <slot />
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseIcon from './BaseIcon.vue'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg'

interface Props {
  variant?: ButtonVariant
  size?: ButtonSize
  disabled?: boolean
  loading?: boolean
  icon?: string
  iconSize?: number
  active?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'secondary',
  size: 'sm',
  disabled: false,
  loading: false,
  iconSize: 16,
  active: false,
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const handleClick = (e: MouseEvent) => {
  if (!props.disabled && !props.loading) {
    emit('click', e)
  }
}

const buttonClasses = computed(() => {
  const base = 'inline-flex items-center justify-center font-medium transition-all duration-150 ease-gs focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 disabled:opacity-40 disabled:cursor-not-allowed'
  
  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700 shadow-sm disabled:hover:bg-primary-500',
    secondary: 'bg-gs-bg-tertiary text-gs-text-primary hover:bg-gs-border-light active:bg-gs-border border border-gs-border-light dark:bg-gs-dark-surface dark:text-gs-dark-text-primary dark:border-gs-border-dark dark:hover:bg-gs-dark-elevated disabled:hover:bg-gs-bg-tertiary',
    ghost: 'text-gs-text-secondary hover:bg-gs-bg-tertiary hover:text-gs-text-primary active:bg-gs-border-light dark:text-gs-dark-text-secondary dark:hover:bg-gs-dark-elevated dark:hover:text-gs-dark-text-primary disabled:hover:bg-transparent',
    danger: 'bg-danger-500 text-white hover:bg-danger-600 active:bg-red-700 shadow-sm disabled:hover:bg-danger-500',
    success: 'bg-success-500 text-white hover:bg-success-600 active:bg-green-700 shadow-sm disabled:hover:bg-success-500',
  }
  
  const sizes: Record<ButtonSize, string> = {
    xs: 'px-2 py-1 text-xs gap-1 rounded',
    sm: 'px-2.5 py-1.5 text-sm gap-1.5 rounded-gs',
    md: 'px-3 py-2 text-sm gap-2 rounded-gs',
    lg: 'px-4 py-2.5 text-base gap-2 rounded-lg',
  }
  
  const activeClasses = props.active ? 'ring-2 ring-primary-500/30' : ''
  
  return `${base} ${variants[props.variant]} ${sizes[props.size]} ${activeClasses}`
})
</script>

<style scoped>
.btn-loading-indicator {
  @apply flex items-center justify-center;
}

.btn-icon {
  @apply flex items-center justify-center shrink-0;
}

.btn-content {
  @apply leading-none;
}
</style>
