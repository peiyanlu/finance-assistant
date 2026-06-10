<script setup lang="ts">
import type { XlsxRaw, XlsxReadResult } from '@/electron/IpcInterface'
import { arrayUniqueByKey, getColumnMinWidth } from '@/views/utils'
import type { TableColumnCtx, TableInstance } from 'element-plus'
import { nextTick, ref, watch } from 'vue'


interface FilterRaw {
  text: string;
  value: string;
}

interface ColumnSchema {
  prop: string
  label: string
  filters: FilterRaw[]
}


const { xlsxAllData } = defineProps<{
  xlsxAllData: XlsxReadResult[],
}>()


const tableRef = ref<TableInstance>()
const sheetData = ref<XlsxRaw[]>([])
const filters = ref<[ string, string[] ][]>([])
const xlsxFilteredData = ref<XlsxRaw[]>([])
const xlsxSheets = ref<string[]>([ ...xlsxAllData.map(i => i.key as string) ])
const columns = ref<ColumnSchema[]>([])


const inferColumns = (rows: XlsxRaw[]): ColumnSchema[] => {
  if (!rows.length) return []
  
  const firstRow = rows[0]
  return Object.keys(firstRow).map((key) => {
    let filters: FilterRaw[] = []
    
    filters = arrayUniqueByKey(
      rows.map(k => {
        const val = String(k[key])
        return { text: val, value: val }
      }),
      'value',
    )
    
    return { prop: key, label: key, filters }
  })
}


const handleFilterMethod = (value: string, row: XlsxRaw, column: TableColumnCtx<XlsxRaw>) => {
  const property = column['property']
  return row[property] == value
}
const handleFilterChange = async (newFilters: object) => {
  const entries = Object.entries(newFilters) as [ string, string[] ][]
  const [ [ n, v ] ] = entries
  const index = filters.value.findIndex(([ k ]) => k === n)
  const isExist = index > -1
  const isReset = v.length === 0
  
  if (isExist) {
    if (isReset) {
      filters.value.splice(index, 1)
    }
  } else {
    filters.value.push(...entries)
  }
  
  await nextTick()
  
  const data = (tableRef.value?.store?.states?.data.value || []) as XlsxRaw[]
  xlsxFilteredData.value = [ ...data ]
}


const emit = defineEmits<{
  'data-change': [ data: XlsxRaw[] ]
}>()


watch(xlsxFilteredData, (val) => {
  columns.value = inferColumns(val)
  emit('data-change', val)
})


const active = ref(xlsxSheets.value[0])
const handleTabChange = (active: string | number) => {
  const { key, value = [] } = xlsxAllData.find(k => k.key === active) ?? {}
  
  sheetData.value = [ ...value ]
  xlsxFilteredData.value = [ ...value ]
  
  console.log(key, value)
}
handleTabChange(active.value)


const handleClearFilter = () => {
  tableRef.value!.clearFilter()
  xlsxFilteredData.value = [ ...sheetData.value.slice() ]
  filters.value = []
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
          '--tooltip-default-text-color': 'rgba(var(--primary-color), 1)',
          '--tooltip-default-color': 'var(--button-default-color)',
        }"
        style="display: flex; align-items: center; justify-content: center;"
      >
        <var-tooltip
          :same-width="false"
          :disabled="!filters.length"
          :teleport="false"
        >
          <var-button
            id="tooltip-trigger"
            size="small"
            style="margin-left: 12px;"
            type="warning"
            :disabled="!filters.length"
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
  
  <el-table
    ref="tableRef"
    :data="sheetData"
    :max-height="780"
    @filter-change="handleFilterChange"
    stripe
  >
    <template v-for="(col, index) in columns" :key="col.prop">
      <el-table-column
        v-if="col.filters.length > 0"
        :prop="col.prop"
        :label="col.label.trim()"
        :fixed="index === 0"
        sortable
        :min-width="getColumnMinWidth(col.label, 40)"
        :filters="col.filters"
        :filter-method="handleFilterMethod"
      >
        <template #default="{ row }">
          {{ row[col.prop] }}
        </template>
      </el-table-column>
      <el-table-column
        v-else
        :prop="col.prop"
        :label="col.label.trim()"
        :fixed="index === 0"
        sortable
        :min-width="getColumnMinWidth(col.label)"
      >
        <template #default="{ row }">
          {{ row[col.prop] }}
        </template>
      </el-table-column>
    </template>
  </el-table>
</template>

<style scoped>
.xlsx-sheet {
  display: flex;
  flex-flow: row nowrap;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  
  .sheet-left {
    max-width: calc(100% - 16px - 180px);
    display: flex;
    justify-content: flex-start;
    align-items: center;
    
    :has(.sheet-tabs) {
      max-width: calc(100% - 82px - 200px);
    }
    
    .sheet-tabs {
      padding: unset;
    }
  }
}
</style>
