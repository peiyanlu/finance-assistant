<script lang="ts" setup>
import PdfExtractByXlsx from '@/views/PdfExtractByXlsx.vue'
import { ref } from 'vue'


const loading = ref(false)
</script>

<template>
  <div class="app-wrapper">
    <var-loading
      type="wave"
      description="LOADING"
      :loading="loading"
    >
      <div class="app-container">
        <PdfExtractByXlsx v-model:loading="loading" />
      </div>
    </var-loading>
  </div>
</template>

<style scoped>
.app-wrapper {
  width: 100%;
  height: 100%;
  
  .var-loading {
    width: 100%;
    height: 100%;
    
    :deep(& > .var-loading__inside) {
      max-height: 100vh;
    }
    
    :deep(& > .var-loading__content) {
      width: 100%;
      height: 100%;
      
      .var-loading__content-mask {
        z-index: 999;
      }
    }
  }
}

.app-container {
  width: 100%;
  min-width: 640px;
  height: 100%;
  margin-right: 8px;
  overflow-y: scroll;
  padding: 16px calc(16px - var(--scrollbar-width)) 16px 16px;
  display: grid;
  grid-template-rows: 166px 1fr;
  gap: 16px;
  
  &::-webkit-scrollbar {
    background-color: transparent;
  }
}
</style>
