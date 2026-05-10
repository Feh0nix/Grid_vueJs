<template>
  <div class="tooltip-wrapper" @mouseenter="show" @mouseleave="hide" @focus="show" @blur="hide">
    <slot />
    <Teleport to="body">
      <Transition name="tooltip">
        <div
          v-if="visible"
          class="tooltip-content"
          :class="[`tooltip-${position}`, tooltipClass]"
          :style="tooltipStyle"
        >
          <div class="tooltip-inner">
            {{ content }}
          </div>
          <div class="tooltip-arrow" />
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right'

interface Props {
  content: string
  position?: TooltipPosition
  delay?: number
  offset?: number
  tooltipClass?: string
}

const props = withDefaults(defineProps<Props>(), {
  position: 'bottom',
  delay: 200,
  offset: 8,
})

const visible = ref(false)
const tooltipStyle = ref({})

let showTimeout: ReturnType<typeof setTimeout> | null = null
let hideTimeout: ReturnType<typeof setTimeout> | null = null

const show = async (e?: Event) => {
  if (hideTimeout) {
    clearTimeout(hideTimeout)
    hideTimeout = null
  }
  
  showTimeout = setTimeout(async () => {
    visible.value = true
    await nextTick()
    
    // Get trigger element from the wrapper
    const wrapper = (e?.currentTarget as HTMLElement) || document.activeElement
    if (wrapper) {
      calculatePosition(wrapper)
    }
  }, props.delay)
}

const hide = () => {
  if (showTimeout) {
    clearTimeout(showTimeout)
    showTimeout = null
  }
  
  hideTimeout = setTimeout(() => {
    visible.value = false
  }, 100)
}

const calculatePosition = (trigger: HTMLElement) => {
  const triggerRect = trigger.getBoundingClientRect()
  const scrollX = window.scrollX || window.pageXOffset
  const scrollY = window.scrollY || window.pageYOffset
  
  let top = 0
  let left = 0
  
  switch (props.position) {
    case 'top':
      top = triggerRect.top + scrollY - props.offset
      left = triggerRect.left + scrollX + triggerRect.width / 2
      break
    case 'bottom':
      top = triggerRect.bottom + scrollY + props.offset
      left = triggerRect.left + scrollX + triggerRect.width / 2
      break
    case 'left':
      top = triggerRect.top + scrollY + triggerRect.height / 2
      left = triggerRect.left + scrollX - props.offset
      break
    case 'right':
      top = triggerRect.top + scrollY + triggerRect.height / 2
      left = triggerRect.right + scrollX + props.offset
      break
  }
  
  tooltipStyle.value = {
    top: `${top}px`,
    left: `${left}px`,
  }
}
</script>

<style scoped>
.tooltip-wrapper {
  @apply relative inline-flex;
}

.tooltip-content {
  @apply absolute z-[9999] pointer-events-none;
}

.tooltip-inner {
  @apply px-2 py-1 text-xs font-medium text-white bg-gray-900 
         rounded shadow-lg whitespace-nowrap;
  @apply dark:bg-gray-800;
}

.tooltip-arrow {
  @apply absolute w-2 h-2 bg-gray-900 rotate-45;
  @apply dark:bg-gray-800;
}

/* Position-specific arrow placement */
.tooltip-top .tooltip-arrow {
  @apply bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2;
}

.tooltip-bottom .tooltip-arrow {
  @apply top-0 left-1/2 -translate-x-1/2 -translate-y-1/2;
}

.tooltip-left .tooltip-arrow {
  @apply right-0 top-1/2 translate-x-1/2 -translate-y-1/2;
}

.tooltip-right .tooltip-arrow {
  @apply left-0 top-1/2 -translate-x-1/2 -translate-y-1/2;
}

/* Transform origin for tooltip */
.tooltip-top {
  transform-origin: bottom center;
}

.tooltip-bottom {
  transform-origin: top center;
}

.tooltip-left {
  transform-origin: right center;
}

.tooltip-right {
  transform-origin: left center;
}

/* Transitions */
.tooltip-enter-active,
.tooltip-leave-active {
  @apply transition-all duration-200 ease-gs;
}

.tooltip-enter-from,
.tooltip-leave-to {
  @apply opacity-0 scale-95;
}
</style>
