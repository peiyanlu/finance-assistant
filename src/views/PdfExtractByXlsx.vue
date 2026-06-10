<script setup lang="ts">
import type { FileIpcInterface, PdfInfo, PdfMatchResult, XlsxInfo, XlsxReadResult } from '@/electron/IpcInterface'
import { fileChannel } from '@/electron/IpcInterface'
import HelpTip from '@/views/HelpTip.vue'
import PdfPreview from '@/views/PdfPreview.vue'
import { getTimestamp, readFieAsArrayBuffer, safeUint8 } from '@/views/utils'
import XlsxDataTable from '@/views/XlsxDataTable.vue'
import { ElectronApp, IpcApp } from '@peiyanlu/electron/frontend'
import { useDropZone, useEventListener } from '@vueuse/core'
import { ParsedPath } from 'node:path'
import { computed, reactive, ref, useTemplateRef, watch } from 'vue'


ElectronApp.startup()
const fileIpc = IpcApp.makeIpcFunctionProxy<FileIpcInterface>(fileChannel, 'callMethod')


const loading = defineModel('loading', { default: false })

const open = reactive<{
  xlsx: string;
  xlsxParse?: ParsedPath;
  xlsxBuffer?: ArrayBuffer;
  pdf: string;
  pdfParse?: ParsedPath;
  pdfBuffer?: ArrayBuffer;
}>({
  xlsx: '',
  xlsxParse: undefined,
  xlsxBuffer: undefined,
  pdf: '',
  pdfParse: undefined,
  pdfBuffer: undefined,
})

const xlsxInfo = ref<XlsxInfo>({
  data: [],
  size: '',
})

const pdfInfo = ref<PdfInfo>({
  numPages: 0,
  size: '',
})


const handleResetOpenedPdf = () => {
  pdfData.value = { numPages: 0, matchedPages: [], pdfBytes: new Uint8Array() }
  nullMatched.value = false
}

const xlsxAllData = ref<XlsxReadResult[]>([])
watch(xlsxAllData, () => {
  handleResetOpenedPdf()
})

const pdfData = ref<PdfMatchResult>({ numPages: 0, matchedPages: [], pdfBytes: new Uint8Array() })
const nullMatched = ref<boolean>(false)
const inMatch = ref<boolean>(false)

const xlsxUploaded = computed(() => {
  return open.xlsx.length !== 0 && open.xlsxBuffer !== undefined
})
const pdfUploaded = computed(() => {
  return open.pdf.length !== 0 && open.pdfBuffer !== undefined
})
const canMatch = computed(() => {
  return pdfUploaded.value && selectedData.value.length > 0
})
const canExtract = computed(() => {
  return pdfUploaded.value && pdfData.value.matchedPages.length > 0
})

const selectedColumn = ref<string>('')
const selectedData = ref<string[]>([])
const clearSelected = () => {
  selectedColumn.value = ''
  selectedData.value = []
}
watch(selectedData, (nVal, oVal) => {
  handleResetOpenedPdf()
})


const loadingHelper = async (fn: () => Promise<void>) => {
  loading.value = true
  await fn().finally(() => loading.value = false)
  loading.value = false
}


const handleReadXlsxBuffer = async (buffer: ArrayBuffer) => {
  await loadingHelper(async () => {
    xlsxAllData.value = []
    const res = await fileIpc.readXlsx(buffer)
    xlsxAllData.value = [ ...res ]
    
    console.log('readXlsx', res)
  })
}

const handleReadPdfBuffer = async (buffer: ArrayBuffer) => {
  await loadingHelper(async () => {
    inMatch.value = true
    
    pdfData.value = { numPages: 0, matchedPages: [], pdfBytes: new Uint8Array() }
    const search = [ ...selectedData.value ]
    const res = await fileIpc.matchPdf(buffer, { search })
    pdfData.value = { ...res }
    
    nullMatched.value = res.matchedPages.length === 0
    inMatch.value = false
    
    console.log('search', [ ...search ])
    console.log('matchPdf', res)
  })
}

const loadXlsx = async (filename: string, parse: ParsedPath, buffer: ArrayBuffer) => {
  open.xlsx = filename
  open.xlsxParse = parse
  open.xlsxBuffer = buffer
  
  const info = await fileIpc.readXlsxInfo(buffer)
  xlsxInfo.value = { ...info }
  
  await handleReadXlsxBuffer(buffer)
}

const loadPdf = async (filename: string, parse: ParsedPath, buffer: ArrayBuffer) => {
  open.pdf = filename
  open.pdfParse = parse
  open.pdfBuffer = buffer
  
  const info = await fileIpc.readPdfInfo(buffer)
  pdfInfo.value = { ...info }
  
  if (selectedData.value.length > 0) {
    await handleReadPdfBuffer(buffer)
  }
}

const handleSourceFile = async (file: File) => {
  const filename: string = file.name
  const parse = await ElectronApp.pathIpc.parse(filename)
  
  const { ext } = parse
  
  if ([ '.pdf' ].includes(ext) && !pdfUploaded.value) {
    const buffer = await readFieAsArrayBuffer(file)
    await loadPdf(filename, parse, buffer)
  }
  
  if ([ '.xlsx' ].includes(ext) && !xlsxUploaded.value) {
    const buffer = await readFieAsArrayBuffer(file)
    await loadXlsx(filename, parse, buffer)
  }
}


// 选择文件
const handleOpenXlsxFile = async () => {
  const { filePaths } = await ElectronApp.dialogIpc.showOpenDialog({
    properties: [ 'openFile' ],
    title: '选择 xlsx 文件',
    filters: [ { name: 'xlsx', extensions: [ 'xlsx' ] } ],
  })
  if (!filePaths.length) return
  
  clearSelected()
  
  await loadingHelper(async () => {
    const input = filePaths[0]
    const filename = input
    const parse = await ElectronApp.pathIpc.parse(filename)
    const buffer = await fileIpc.readPath(input)
    
    await loadXlsx(filename, parse, buffer)
  })
}

const handleOpenPdfFile = async () => {
  const { filePaths } = await ElectronApp.dialogIpc.showOpenDialog({
    properties: [ 'openFile' ],
    title: '选择 pdf 文件',
    filters: [ { name: 'pdf', extensions: [ 'pdf' ] } ],
  })
  if (!filePaths.length) return
  
  handleResetOpenedPdf()
  
  await loadingHelper(async () => {
    const input = filePaths[0]
    const filename = input
    const parse = await ElectronApp.pathIpc.parse(filename)
    const buffer = await fileIpc.readPath(input)
    
    await loadPdf(filename, parse, buffer)
  })
}

// 拖拽上传
const dropZoneRef = useTemplateRef<HTMLElement>('dropZoneRef')
const { isOverDropZone } = useDropZone(dropZoneRef, {
  onDrop: async (files: File[] | null) => {
    if (!files) return
    
    for (const file of files) {
      await handleSourceFile(file)
    }
  },
  dataTypes: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
  multiple: false,
  preventDefaultForUnhandled: false,
})

// 粘贴上传
useEventListener('paste', async (evt: ClipboardEvent) => {
  const items = evt.clipboardData?.items
  if (!items) return
  
  const files = Array
    .from(items)
    .filter(k => k.kind === 'file')
    .map(k => k.getAsFile())
    .filter((e): e is Exclude<typeof e, null> => e !== null)
    .filter(async (e) => {
      const { ext } = await ElectronApp.pathIpc.parse(e.name)
      return [ '.xlsx', '.pdf' ].includes(ext)
    })
  
  if (files.length === 0) return
  
  for (const file of files) {
    await handleSourceFile(file)
  }
})

// 提取 pdf
const inExtracted = ref<boolean>(false)
const handleExtract = async () => {
  inExtracted.value = true
  const uint8 = safeUint8(pdfData.value.pdfBytes)
  
  const filename = `${ APP_NAME } ${ getTimestamp() }.pdf`
  const { filePath } = await ElectronApp.dialogIpc.showSaveDialog({
    title: '下载 PDF',
    defaultPath: filename,
    filters: [ { name: 'pdf', extensions: [ 'pdf' ] } ],
  })
  
  if (filePath) {
    await fileIpc.writeFile(filePath, uint8)
  }
  inExtracted.value = false
}

</script>

<template>
  <div
    class="app-container"
    ref="dropZoneRef"
    :class="{light: isOverDropZone}"
  >
    <div class="upload-container">
      <div class="file-upload">
        <div class="tips-icon">
          <div class="action">
            <var-button text-color="#21A366" @click="handleOpenXlsxFile">
              <svg-icon name="excel" size="24px" />
              <span style="margin-left: 4px">xlsx 上传</span>
            </var-button>
          </div>
          
          <HelpTip content="支持拖拽、粘贴文件到应用内" />
        </div>
        
        <div class="tips-text" v-if="open.xlsx">
          <var-chip size="small" plain color="#009688">
            <var-ellipsis
              :tooltip="{
                  color: 'var(--button-default-color)',
                  textColor: 'rgba(var(--primary-color), 1)',
                  sameWidth: false
                }"
            >
              <div class="file-meta">
                <svg-icon name="excel-read" size="16px" />
                {{ open.xlsxParse?.name }}
              </div>
              <template #tooltip-content>
                <span style="font-size: 12px;">{{ open.xlsx }}</span>
              </template>
            </var-ellipsis>
          </var-chip>
          
          <var-chip size="small" plain>{{ xlsxInfo.size }}</var-chip>
          
          <var-chip size="small" plain type="success">
            <var-ellipsis
              :tooltip="{
                    color: 'var(--button-default-color)',
                    textColor: 'rgba(var(--primary-color), 1)',
                    sameWidth: false
                  }"
            >
              {{ xlsxInfo.data.length }} · Sheets
              <template #tooltip-content>
                <div style="display: flex;gap: 4px;flex-flow: column nowrap;">
                  <span v-for="i of xlsxInfo.data" style="font-size: 12px;">
                    {{ i.sheetName }} · {{ i.rowCount }}
                  </span>
                </div>
              </template>
            </var-ellipsis>
          </var-chip>
        </div>
      </div>
      
      <div class="file-upload" :class="{error: nullMatched}">
        <div class="tips-icon">
          <div class="action">
            <var-button
              text-color="#ef8983"
              @click="handleOpenPdfFile"
            >
              <svg-icon name="pdf" size="24px" />
              <span style="margin-left: 4px">pdf 上传</span>
            </var-button>
            
            <var-button
              :disabled="!canMatch"
              :loading="inMatch"
              loading-type="wave"
              @click="handleReadPdfBuffer(open.pdfBuffer!)"
              type="info"
            >
              <svg-icon name="file-match" size="24px" />
              <span style="margin-left: 4px">pdf 匹配</span>
            </var-button>
            
            <var-button
              :disabled="!canExtract"
              :loading="inExtracted"
              loading-type="wave"
              @click="handleExtract"
              type="success"
            >
              <svg-icon name="pdf-extract" size="24px" />
              <span style="margin-left: 4px">pdf 提取</span>
            </var-button>
          </div>
          <HelpTip content="支持拖拽、粘贴文件到应用内" />
        </div>
        
        <div class="tips-text" v-if="open.pdf">
          <var-chip v-if="nullMatched" size="small" type="danger">匹配失败</var-chip>
          
          <var-chip size="small" plain color="#009688">
            <var-ellipsis
              :tooltip="{
                  color: 'var(--button-default-color)',
                  textColor: 'rgba(var(--primary-color), 1)',
                  sameWidth: false
                }"
            >
              <div class="file-meta">
                <svg-icon name="pdf-read" size="16px" />
                {{ open.pdfParse?.name }}
              </div>
              <template #tooltip-content>
                <span style="font-size: 12px;">{{ open.pdf }}</span>
              </template>
            </var-ellipsis>
          </var-chip>
          
          <var-chip size="small" plain>{{ pdfInfo.size }}</var-chip>
          
          <var-chip size="small" plain type="success">{{ pdfInfo.numPages }} 页</var-chip>
        </div>
      </div>
    </div>
    
    <div
      class="data-container"
      :class="{
        'two-column': canExtract
      }"
    >
      <XlsxDataTable
        v-if="xlsxAllData.length"
        :xlsx-all-data="xlsxAllData"
        v-model:selected="selectedData"
        v-model:selected-column="selectedColumn"
      />
      
      <PdfPreview
        v-if="pdfData.matchedPages.length>0"
        :get-keywords="page =>[ pdfData.matchedPages[page-1][0]]"
        :pdf-bytes="pdfData.pdfBytes"
        style="max-height: 828px;"
      />
    </div>
  </div>
</template>

<style scoped>
.app-container {
  width: 100%;
  height: 100%;
  min-width: 1200px;
  padding: 16px;
  display: grid;
  grid-template-rows: 120px minmax(0, 1fr);
  gap: 16px;
  transition: background 0.25s ease,
  box-shadow 0.25s ease;
  
  .upload-container {
    width: 100%;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
    
    .file-upload {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      flex-flow: column nowrap;
      justify-content: center;
      border-radius: 12px;
      gap: 12px;
      padding: 12px;
      background: rgba(var(--primary-color), .1);
      
      .tips-icon {
        display: flex;
        align-items: center;
        justify-content: flex-start;
        color: rgba(var(--primary-color), .5);
        gap: 16px;
        
        .action {
          display: flex;
          align-items: center;
          flex-flow: row nowrap;
          justify-content: center;
          gap: 8px;
        }
      }
      
      .tips-text {
        width: 100%;
        display: flex;
        flex-flow: row wrap;
        justify-content: center;
        align-items: center;
        gap: 6px;
      }
      
      &.error {
        background: rgba(159, 59, 56, .15);
      }
    }
    
    .file-meta {
      display: flex;
      align-items: center;
      gap: 4px;
    }
  }
  
  .data-container {
    width: 100%;
    overflow: auto;
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
    
    &.two-column {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  
  &.light {
    background: var(--drop-bg);
    box-shadow: inset 0 2px 8px var(--drop-highlight),
    inset 0 -4px 12px var(--drop-shadow),
    inset 0 0 40px var(--drop-glow);
  }
}
</style>
