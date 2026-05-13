<script setup lang="ts">
import type {
  FileIpcInterface,
  PdfExtractOptions,
  PdfExtractResult,
  PdfMatchResult,
  XlsxReadResult,
} from '@/electron/IpcInterface'
import { fileChannel } from '@/electron/IpcInterface'
import { dateNow } from '@/views/utils'
import XlsxDataTable from '@/views/XlsxDataTable.vue'
import { ElectronApp, IpcApp } from '@peiyanlu/electron/frontend'
import { Snackbar } from '@varlet/ui'
import { useDropZone, useEventListener } from '@vueuse/core'
import { NButton, useNotification } from 'naive-ui'
import { computed, h, reactive, ref, useTemplateRef, watch } from 'vue'


ElectronApp.startup()
const fileIpc = IpcApp.makeIpcFunctionProxy<FileIpcInterface>(fileChannel, 'callMethod')


const notification = useNotification()

const loading = defineModel('loading', { default: false })

const open = reactive<{
  xlsx: string;
  xlsxBuffer: string | ArrayBuffer;
  xlsxDragged: boolean;
  pdf: string;
  pdfBuffer: string | ArrayBuffer;
  pdfDragged: boolean;
}>({
  xlsx: '',
  xlsxBuffer: '',
  xlsxDragged: false,
  pdf: '',
  pdfBuffer: '',
  pdfDragged: false,
})


const handleResetOpenedPdf = () => {
  pdfData.value = { numPages: 0, matchedPages: [] }
  open.pdf = ''
  open.pdfBuffer = ''
  open.pdfDragged = false
}
const handleResetOpenedXlsx = () => {
  xlsxAllData.value = []
  open.xlsx = ''
  open.xlsxBuffer = ''
  open.xlsxDragged = false
}


const xlsxAllData = ref<XlsxReadResult[]>([])
watch(xlsxAllData, () => {
  handleResetOpenedPdf()
})

const pdfData = ref<PdfMatchResult>({ numPages: 0, matchedPages: [] })
const successMatched = computed(() => {
  const { numPages, matchedPages } = pdfData.value
  return numPages !== 0 && matchedPages.length !== 0
})

const selectedColumn = ref<string>('')
const selectedData = ref<string[]>([])
watch(selectedData, () => {
  handleResetOpenedPdf()
})


const loadingHelper = async (fn: () => Promise<void>) => {
  loading.value = true
  await fn().finally(() => loading.value = false)
  loading.value = false
}


// 选择文件
const handleOpenXlsxFile = async () => {
  const { filePaths } = await ElectronApp.dialogIpc.showOpenDialog({
    properties: [ 'openFile' ],
    title: '选择 xlsx 文件',
    filters: [ { name: 'xlsx', extensions: [ 'xlsx' ] } ],
  })
  if (!filePaths.length) return
  
  await loadingHelper(async () => {
    const input = filePaths[0]
    open.xlsx = input
    open.xlsxBuffer = ''
    open.xlsxDragged = false
    
    xlsxAllData.value = []
    
    const resMulti = await fileIpc.readXlsx(input)
    xlsxAllData.value = [ ...resMulti ]
    
    console.log('xlsxAllData', xlsxAllData.value)
  })
}

const handleOpenPdfFile = async () => {
  const { filePaths } = await ElectronApp.dialogIpc.showOpenDialog({
    properties: [ 'openFile' ],
    title: '选择 pdf 文件',
    filters: [ { name: 'pdf', extensions: [ 'pdf' ] } ],
  })
  if (!filePaths.length) return
  
  await loadingHelper(async () => {
    const input = filePaths[0]
    open.pdf = input
    open.pdfBuffer = ''
    open.pdfDragged = false
    
    pdfData.value = { numPages: 0, matchedPages: [] }
    
    const search = [ ...selectedData.value ]
    const res = await fileIpc.readPdf(input, { search })
    pdfData.value = { ...res }
    
    console.log('search', [ ...search ])
    console.log('readPdf', { ...res })
  })
}


// 拖拽上传
const readFieAsArrayBuffer = (file: File) => {
  return new Promise<ArrayBuffer>((resolve) => {
    const reader = new FileReader()
    reader.onloadend = (evt) => resolve(evt.target?.result as ArrayBuffer)
    reader.readAsArrayBuffer(file)
  })
}

const handleReadXlsxBuffer = async (file: File) => {
  await loadingHelper(async () => {
    const buffer = await readFieAsArrayBuffer(file)
    open.xlsx = file.name
    open.xlsxBuffer = buffer
    open.xlsxDragged = true
    
    xlsxAllData.value = []
    
    const res = await fileIpc.readXlsx(buffer)
    xlsxAllData.value = [ ...res ]
    
    console.log('readXlsx', res)
  })
}

const handleReadPdfBuffer = async (file: File) => {
  await loadingHelper(async () => {
    const buffer = await readFieAsArrayBuffer(file)
    open.pdf = file.name
    open.pdfBuffer = buffer
    open.pdfDragged = true
    
    pdfData.value = { numPages: 0, matchedPages: [] }
    
    const search = [ ...selectedData.value ]
    const res = await fileIpc.readPdf(buffer, { search })
    pdfData.value = { ...res }
    
    console.log('search', [ ...search ])
    console.log('readPdf', res)
  })
}

const dropZoneRef1 = useTemplateRef<HTMLElement>('dropZoneRef1')
const { isOverDropZone: isOverDropZone1 } = useDropZone(dropZoneRef1, {
  onDrop: async (files: File[] | null) => {
    if (!files) return
    await handleReadXlsxBuffer(files[0])
  },
  dataTypes: [ 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ],
  multiple: false,
  preventDefaultForUnhandled: false,
})

const dropZoneRef2 = useTemplateRef<HTMLElement>('dropZoneRef2')
const { isOverDropZone: isOverDropZone2 } = useDropZone(dropZoneRef2, {
  onDrop: async (files: File[] | null) => {
    if (!files) return
    await handleReadPdfBuffer(files[0])
  },
  dataTypes: [ 'application/pdf' ],
  multiple: false,
  preventDefaultForUnhandled: false,
})


// 提取 pdf
const isExtracted = ref<boolean>(false)
const extractResult = ref<PdfExtractResult>({ output: '' })
const handleExtract = async () => {
  isExtracted.value = true
  
  try {
    const extractPdf = (input: string | ArrayBuffer, opts: PdfExtractOptions) => {
      if (typeof input === 'string') {
        return fileIpc.extractPdf(input, opts)
      }
      return fileIpc.extractPdf(input, opts)
    }
    
    const input: string | ArrayBuffer = open.pdfDragged ? open.pdfBuffer : open.pdf
    const matchedPages = [ ...pdfData.value.matchedPages ]
    const res = await extractPdf(input, { matchedPages })
    extractResult.value = res
    isExtracted.value = false
    
    console.log('matchedPages', [ ...matchedPages ])
    console.log('extractResult', { ...res })
    
    const n = notification.success({
      title: 'PDF 提取结果',
      content: `已提取：${ res.output }`,
      meta: dateNow(),
      action: () => h(
        NButton,
        {
          text: true,
          type: 'primary',
          onClick: () => {
            n.destroy()
          },
        },
        {
          default: () => '已读',
        },
      ),
      closable: false,
    })
  } catch (e: any) {
    console.log('extractResultError', e)
    isExtracted.value = false
    
    const n = notification.error({
      title: 'PDF 提取结果',
      content: `提取失败：${ e.message }`,
      meta: dateNow(),
      action: () => h(
        NButton,
        {
          text: true,
          type: 'primary',
          onClick: () => {
            n.destroy()
          },
        },
        {
          default: () => '已读',
        },
      ),
      closable: false,
    })
  }
}


// 粘贴上传
useEventListener('paste', async (evt: ClipboardEvent) => {
  const items = evt.clipboardData?.items
  if (!items) return
  
  const files = Array
    .from(items)
    .filter(k => k.kind === 'file')
    .map(k => k.getAsFile())
    .filter((e): e is Exclude<typeof e, null> => e !== null)
  
  if (files.length === 0) return
  
  const input = files[0]
  const ext = input.name.split('.')[1]
  
  if (![ 'xlsx', 'pdf' ].includes(ext)) return
  
  if (open.xlsx || open.xlsxBuffer) {
    if (selectedData.value.length) {
      if ([ 'pdf' ].includes(ext)) {
        await handleReadPdfBuffer(input)
      } else {
        Snackbar({
          content: '请粘贴 pdf 文件',
          type: 'warning',
        })
      }
    }
  } else {
    if ([ 'xlsx' ].includes(ext)) {
      await handleReadXlsxBuffer(input)
    } else {
      Snackbar({
        content: '请粘贴 xlsx 文件',
        type: 'warning',
      })
    }
  }
})
</script>

<template>
  <div class="upload-container">
    <div class="file-upload">
      <div
        ref="dropZoneRef1"
        :class="{light: isOverDropZone1}"
        class="dropZone"
        @drop.prevent
        @dragover.prevent
      >
        <div class="tips-icon">
          <div class="action">
            <var-button
              text-color="#21A366"
              @click="handleOpenXlsxFile"
            >
              <svg-icon name="excel" size="24px" />
              <span style="margin-left: 4px">xlsx 文件</span>
            </var-button>
          </div>
          <svg-icon name="drag-upload" size="64px" style="opacity: .75;" />
        </div>
        
        <div class="tips-text">
          <span>拖拽 xlsx 文件到此处</span>
          
          <var-ellipsis
            v-if="open.xlsx"
            style="max-width: calc(100% - 32px);"
            :tooltip="{
              color: 'var(--button-default-color)',
              textColor: 'var(--primary-text-color)',
              sameWidth: false
            }"
          >
            <span>已打开：{{ open.xlsx }}</span>
            <template #tooltip-content>
              <div style="word-break: break-all;font-size: 12px;">已打开：{{ open.xlsx }}</div>
            </template>
          </var-ellipsis>
        </div>
      </div>
    </div>
    
    <div class="file-upload">
      <div
        ref="dropZoneRef2"
        :class="{light: isOverDropZone2, disabled: selectedData.length === 0}"
        class="dropZone"
      >
        <div class="tips-icon">
          <div class="action">
            <var-button
              text-color="#ef8983"
              @click="handleOpenPdfFile"
            >
              <svg-icon name="pdf" size="24px" />
              <span style="margin-left: 4px">pdf 文件</span>
            </var-button>
            
            <var-button
              v-if="successMatched"
              :loading="isExtracted"
              @click="handleExtract"
              type="success"
            >
              <svg-icon name="pdf-extract" size="24px" />
              <span style="margin-left: 4px">
                pdf 提取({{ pdfData.matchedPages?.length }} 页)
              </span>
            </var-button>
            
            <var-chip
              v-else-if="pdfData.numPages !== 0"
              size="small"
            >
              未找到任何结果
            </var-chip>
          </div>
          <svg-icon name="drag-upload" size="64px" style="opacity: .75;" />
        </div>
        
        <div class="tips-text">
          <span>拖拽 pdf 文件到此处</span>
          
          <var-ellipsis
            v-if="open.pdf"
            style="max-width: calc(100% - 32px);"
            :tooltip="{
              color: 'var(--button-default-color)',
              textColor: 'var(--primary-text-color)',
              sameWidth: false
            }"
          >
            <span>已打开：{{ open.pdf }}</span>
            <template #tooltip-content>
              <div style="word-break: break-all; font-size: 12px;">已打开：{{ open.pdf }}</div>
            </template>
          </var-ellipsis>
        </div>
      </div>
    </div>
  </div>
  
  <div class="xlsx-data-container">
    <XlsxDataTable
      v-if="xlsxAllData.length"
      :xlsx-all-data="xlsxAllData"
      v-model:selected="selectedData"
      v-model:selected-column="selectedColumn"
    />
  </div>
</template>

<style scoped>
.upload-container {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  
  .file-upload {
    width: 100%;
    height: 100%;
    
    .dropZone {
      display: flex;
      align-items: center;
      flex-flow: column nowrap;
      justify-content: center;
      width: 100%;
      height: 100%;
      border: 2px dashed rgba(var(--primary-color), 0.3);
      border-radius: 12px;
      gap: 12px;
      padding: 12px;
      
      .tips-icon {
        display: flex;
        align-items: center;
        justify-content: flex-start;
        color: rgba(var(--primary-color), 0.5);
        gap: 24px;
        
        .action {
          display: flex;
          align-items: center;
          flex-flow: column nowrap;
          justify-content: center;
          gap: 6px;
        }
      }
      
      .tips-text {
        width: 100%;
        font-size: 12px;
        line-height: 1;
        display: flex;
        align-items: center;
        flex-flow: column wrap;
        justify-content: center;
        user-select: none;
        opacity: .8;
        gap: 6px;
        text-align: center;
      }
      
      &.light {
        border-color: aquamarine;
      }
      
      &.disabled {
        opacity: .38;
        cursor: not-allowed;
        
        * {
          pointer-events: none;
        }
      }
    }
    
    .flex-center {
      display: flex;
      align-items: center;
      flex-flow: row nowrap;
      justify-content: center;
    }
  }
}

.xlsx-data-container {
  overflow: auto;
}
</style>
