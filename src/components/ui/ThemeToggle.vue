<template>
  <BaseTooltip :content="isDark ? 'Mode clair' : 'Mode sombre'" position="bottom">
    <BaseButton
      variant="ghost"
      size="sm"
      :icon="isDark ? 'sun' : 'moon'"
      @click="toggleTheme"
    />
  </BaseTooltip>
</template>

<script setup lang="ts">
import { useTheme } from '../../composables/useTheme'
import BaseButton from './BaseButton.vue'
import BaseTooltip from './BaseTooltip.vue'

const { isDark, toggleTheme } = useTheme()
</script>
