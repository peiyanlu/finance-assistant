<script lang="ts" setup>
import type { XlsxRaw, XlsxReadResult } from '@/electron/IpcInterface'
import XlsxDataTableCom from '@/views/XlsxDataTableCom.vue'
import { ref } from 'vue'


const { xlsxAllData } = defineProps<{
  xlsxAllData: XlsxReadResult[]
}>()


const selectedData = defineModel<(string | number)[]>('selected', { default: [] })
const selectedColumn = defineModel<string>('selected-column', { default: '' })

const selectOptions = ref<string[]>([])
const xlsxFilteredData = ref<XlsxRaw[]>([])


const handleSelected = (val: string) => {
  if (!val) {
    selectedData.value = []
    return
  }
  
  const filtered = [ ...xlsxFilteredData.value ].map(raw => raw[val])
  selectedData.value = [ ...new Set(filtered) ]
  
  console.log('selectedData', [ ...new Set(filtered) ])
}
const handleCleared = () => {
  selectedData.value = []
}


const handleXlsxDataChange = (data: XlsxRaw[]) => {
  xlsxFilteredData.value = [ ...data ]
  selectedColumn.value = ''
  selectOptions.value = Object.keys(data[0] ?? [])
}
</script>

<template>
  <div class="xlsx-data">
    <XlsxDataTableCom
      :xlsx-all-data="xlsxAllData"
      @data-change="handleXlsxDataChange"
    >
      <var-style-provider
        :style-vars="{
          '--select-label-font-size': '14px',
          '--field-decorator-placeholder-size': '14px'
        }"
      >
        <var-select
          v-if="xlsxFilteredData.length"
          placeholder="选择匹配列"
          v-model="selectedColumn"
          @change="handleSelected"
          @clear="handleCleared"
          style="min-width: 180px;"
          size="small"
          offset-y="16"
          clearable
          :hint="false"
        >
          <var-option
            v-for="item of selectOptions"
            :label="item"
          />
          <template #clear-icon="{ clear }">
            <var-icon
              @click="clear"
              size="16px"
              name="window-close"
            />
          </template>
        </var-select>
      </var-style-provider>
    </XlsxDataTableCom>
  </div>
</template>

<style>
.xlsx-data {
  width: 100%;
  height: 100%;
  display: flex;
  flex-flow: column nowrap;
  gap: 16px;
  min-width: 0;
  min-height: 0;
}
</style>
