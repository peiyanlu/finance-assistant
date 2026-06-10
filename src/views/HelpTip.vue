<script setup lang="ts">
withDefaults(
  defineProps<{
    content: string
    disabled?: boolean
    iconSize?: number
  }>(),
  {
    content: '',
    disabled: false,
    iconSize: 18
  },
)


</script>

<template>
  <var-style-provider
    :style-vars="{
      '--tooltip-default-text-color': 'rgba(var(--primary-color), 1)',
      '--tooltip-default-color': 'var(--button-default-color)',
    }"
    style="display: flex; align-items: center; justify-content: center;"
  >
    <var-tooltip
      :same-width="false"
      :teleport="false"
      :disabled="Boolean(disabled)"
    >
      <var-icon :size="iconSize" name="help-circle-outline" />
      <template #content>{{ content }}</template>
    </var-tooltip>
  </var-style-provider>
</template>

<style scoped>

</style>
