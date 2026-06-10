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
      <PdfExtractByXlsx v-model:loading="loading" />
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
</style>
