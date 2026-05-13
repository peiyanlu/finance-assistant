<script setup lang="ts">
import { useTheme } from '@/theme'
import { isFrontend } from '@peiyanlu/electron'
import { useTitle } from '@vueuse/core'
import { dateZhCN, zhCN } from 'naive-ui'


const isElectron = isFrontend()
const title = useTitle()
const { theme, themeOverrides } = useTheme()
</script>

<template>
  <template v-if="isElectron">
    <n-config-provider
      :locale="zhCN"
      :date-locale="dateZhCN"
      :theme="theme"
      :theme-overrides="themeOverrides"
      style="width: 100%;height: 100%;"
    >
      <n-notification-provider>
        <router-view />
      </n-notification-provider>
    </n-config-provider>
  </template>
  
  <div v-else class="tips">
    <div>"{{ title }}" 不在 Web 端运行</div>
  </div>
</template>

<style>
.tips {
  width: 100%;
  height: 200px;
  display: flex;
  flex-flow: row nowrap;
  justify-content: center;
  align-items: center;
  text-align: center;
  padding: 16px;
  font-size: 24px;
}
</style>
