<script setup lang="ts">
import type { XlsxRaw, XlsxReadResult } from '@/electron/IpcInterface'
import { arrayUniqueByKey, getColumnMinWidth, getTextWidth } from '@/views/utils'
import type { DataTableBaseColumn, DataTableColumns, DataTableFilterState, DataTableInst } from 'naive-ui'
import { TableBaseColumn } from 'naive-ui/es/data-table/src/interface'
import { ref, watch } from 'vue'


type XlsxRawWithKey = XlsxRaw & { key: string | number }

const { xlsxAllData } = defineProps<{
  xlsxAllData: XlsxReadResult[],
}>()


const tableRef = ref<DataTableInst | null>(null)

const sheetData = ref<XlsxRawWithKey[]>([])
const sheetFilters = ref<[ string, string[] ][]>([])
const xlsxFilteredData = ref<XlsxRawWithKey[]>([])
const xlsxSheets = ref<string[]>([ ...xlsxAllData.map(i => i.key as string) ])
const columns = ref<DataTableColumns<XlsxRawWithKey>>([])


const inferColumns = (rows: XlsxRawWithKey[]): DataTableColumns<XlsxRawWithKey> => {
  if (!rows.length) return []
  
  const firstRow = rows[0]
  return Object
    .keys(firstRow)
    .filter(i => i !== 'key')
    .map((key) => {
      const filters: TableBaseColumn<XlsxRawWithKey>['filterOptions'] = arrayUniqueByKey(
        rows.map(k => {
          const val = String(k[key])
          return { label: val, value: val }
        }),
        'value',
      )
      
      const vals = [ ...filters.map(i => i.value), key ]
      const lens = vals.map(i => getTextWidth(String(i)))
      const maxIndex = lens.indexOf(Math.max(...lens))
      const text = String(vals[maxIndex])
      
      return {
        key: key,
        title: key,
        filterOptions: filters,
        sorter: 'default',
        width: getColumnMinWidth(text, 60),
        filter(value: string | number, row: XlsxRaw) {
          return Boolean(~String(row[key]).indexOf(value as string))
        },
      }
    })
}


const handleUpdateFilter = (filters: DataTableFilterState, sourceColumn: DataTableBaseColumn) => {
  sheetFilters.value = Object
    .entries(filters)
    .map(([ k, v ]) => v ? [ k, [ v ].flat().map(String) ] : undefined)
    .filter((i): i is Exclude<typeof i, undefined> => i !== undefined) as [ string, string[] ][]
  console.log(filters, sourceColumn)
}


const emit = defineEmits<{
  'data-change': [ data: XlsxRaw[] ]
}>()


watch(xlsxFilteredData, (val) => {
  columns.value = inferColumns(val)
  emit('data-change', val)
})


const active = ref(xlsxSheets.value[0])
const handleTabChange = async (active: string | number) => {
  const { key, value = [] } = xlsxAllData.find(k => k.key === active) ?? {}
  
  const data = [ ...value ].map((k, i) => ({ ...k, key: i })) as XlsxRawWithKey[]
  sheetData.value = [ ...data ]
  xlsxFilteredData.value = [ ...data ]
  
  columns.value = [ ...inferColumns(data) ]
  emit('data-change', xlsxFilteredData.value)
  
  console.log(key, value)
}
handleTabChange(active.value)


const rowKey = (row: XlsxRaw) => {
  // console.log(row, Object.keys(row)[0], row[Object.keys(row)[0]])
  return undefined
}

const handleClearFilter = () => {
  tableRef.value?.clearFilters()
  xlsxFilteredData.value = [ ...sheetData.value.slice() ]
  sheetFilters.value = []
}
</script>

<template>
  <div class="xlsx-sheet">
    <div class="sheet-left">
      <var-chip color="transparent" type="success">
        <span style="font-weight: 600;font-size: 16px;">Sheets</span>
      </var-chip>
      
      <var-style-provider
        :style-vars="{
          '--tabs-item-horizontal-height': '32px',
        }"
      >
        <var-tabs
          class="sheet-tabs"
          v-model:active="active"
          @change="handleTabChange"
        
        >
          <var-tab
            v-for="item of xlsxSheets"
            :key="item"
            :name="item"
          >
            {{ item }}
          </var-tab>
        </var-tabs>
      </var-style-provider>
      
      <var-style-provider
        :style-vars="{
          '--tooltip-default-text-color': 'var(--primary-text-color)',
          '--tooltip-default-color': 'var(--button-default-color)',
        }"
        style="display: flex; align-items: center; justify-content: center;"
      >
        <var-tooltip
          :same-width="false"
          :disabled="!sheetFilters.length"
          :teleport="false"
        >
          <var-button
            id="tooltip-trigger"
            size="small"
            style="margin-left: 12px;"
            type="warning"
            :disabled="!sheetFilters.length"
            @click="handleClearFilter"
          >
            <svg-icon name="ResReset" size="16px" />
          </var-button>
          <template #content>重置所有过滤</template>
        </var-tooltip>
        
        <var-chip color="transparent" style="width: 148px;">
          <span style="white-space: nowrap;">
            {{ xlsxFilteredData.length }} / {{ sheetData.length }}
          </span>
        </var-chip>
      </var-style-provider>
    </div>
    
    <slot />
  </div>
  
  <n-data-table
    style="width: 100%;"
    ref="tableRef"
    :columns="columns"
    :data="sheetData"
    :pagination=" { pageSize: 10 }"
    :on-update:filters="handleUpdateFilter"
    :row-key="rowKey"
    :pagination-behavior-on-filter="'first'"
  />
</template>

<style scoped>
.xlsx-sheet {
  display: flex;
  flex-flow: row nowrap;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  
  .sheet-left {
    max-width: calc(100% - 196px);
    display: flex;
    justify-content: flex-start;
    align-items: center;
    
    :has(.sheet-tabs) {
      max-width: calc(100% - 282px);
    }
    
    .sheet-tabs {
      padding: unset;
    }
  }
}
</style>
