<script setup lang="ts">
import { fileChannel, FileIpcInterface } from '@/electron/IpcInterface'
import { HoldExecutor, mouseOnly } from '@/views/HoldExecutor'
import { getTimestamp, safeUint8 } from '@/views/utils'
import { ElectronApp, IpcApp } from '@peiyanlu/electron/frontend'
import { useThrottleFn } from '@vueuse/core'
import { getDocument, GlobalWorkerOptions, PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist/legacy/build/pdf.mjs'
import pdfWorker from 'pdfjs-dist/legacy/build/pdf.worker.mjs?url'
import {
  ComponentPublicInstance,
  computed,
  onMounted,
  ref,
  ShallowRef,
  shallowRef,
  useTemplateRef,
  watch,
  watchEffect,
} from 'vue'


GlobalWorkerOptions.workerSrc = pdfWorker


ElectronApp.startup()
const fileIpc = IpcApp.makeIpcFunctionProxy<FileIpcInterface>(fileChannel, 'callMethod')


const props = defineProps<{
  pdfBytes: Uint8Array | ArrayBuffer
  getKeywords?: (page: number) => string[]
}>()

const canvas = ref<HTMLCanvasElement>()
const pdf = shallowRef<PDFDocumentProxy>()
const scale = ref<number>(1)
const pages = ref<number>(1)
const current = ref<number>(1)
const pageCache = new Map<number, PDFPageProxy>()
const uploaded = ref<boolean>(false)
const input = ref<string>('1')

watch(current, (val) => {
  input.value = String(val)
})
const width = computed(() => {
  const len = input.value.length
  return Math.max(32, len * 8.22 - (len - 1) * 0.01)
})

const renderPage = async (pdf: PDFDocumentProxy, pageNumber: number, scale: number, canvas: HTMLCanvasElement) => {
  const page = await pdf.getPage(pageNumber)
  const viewport = page.getViewport({ scale })
  
  const dpr = window.devicePixelRatio || 1
  const canvasContext = canvas.getContext('2d')!
  
  canvas.width = viewport.width * dpr
  canvas.height = viewport.height * dpr
  canvas.style.width = viewport.width + 'px'
  canvas.style.height = viewport.height + 'px'
  
  canvasContext.setTransform(dpr, 0, 0, dpr, 0, 0)
  
  await page.render({ canvasContext, viewport, canvas }).promise
}

const drawRect = (canvas: HTMLCanvasElement, x: number, y: number, w: number, h: number) => {
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = 'rgba(255, 235, 59, .75)'
  ctx.globalCompositeOperation = 'multiply'
  ctx.save()
  ctx.fillRect(x, y, w, h)
}

const searchText = async (page: PDFPageProxy, keywords: string[]) => {
  const textContent = await page.getTextContent()
  const items = textContent.items.filter((item) => 'str' in item)
  
  for (const item of items) {
    for (const keyword of keywords) {
      if (item.str.includes(keyword)) {
        const rect = item.transform
        const viewport = page.getViewport({ scale: scale.value })
        const [ x, y ] = viewport.convertToViewportPoint(rect[4], rect[5])
        
        // ⚠️ 文本宽高不能从 transform 直接取
        const width = item.width * viewport.scale
        const height = item.height * viewport.scale
        
        drawRect(canvas.value!, x, y - height, width, height)
      }
    }
  }
}

const handleRender = async () => {
  await renderPage(pdf.value!, current.value, scale.value, canvas.value!)
  
  const cached = pageCache.get(current.value)
  const page = cached ?? await pdf.value?.getPage(current.value)!
  !cached && pageCache.set(current.value, page)
  
  const keywords = props.getKeywords?.(current.value)
  keywords && await searchText(page, keywords)
}

const throttleHandleRender = useThrottleFn(handleRender, 50)

const getFitScale = async () => {
  const page = await pdf.value?.getPage(current.value)!
  const { width } = page.getViewport({ scale: 1 })
  const { clientWidth = width } = canvas.value!.parentElement ?? {}
  return (clientWidth - 8) / width
}


onMounted(async () => {
  pdf.value = await getDocument(safeUint8(props.pdfBytes)).promise
  pages.value = pdf.value.numPages
  
  uploaded.value = true
  pageCache.clear()
  
  scale.value = await getFitScale()
  
  await throttleHandleRender()
})


const nextPage = async () => {
  if (current.value >= pages.value) {
    return
  }
  
  current.value++
  
  await throttleHandleRender()
}

const prevPage = async () => {
  if (current.value <= 1) {
    return
  }
  
  current.value--
  
  await throttleHandleRender()
}

const zoomIn = async () => {
  scale.value += .05
  
  await throttleHandleRender()
}

const zoomOut = async () => {
  scale.value = Math.max(.5, scale.value - .05)
  
  await throttleHandleRender()
}

const resize = async () => {
  scale.value = 1
  
  await throttleHandleRender()
}

const fit = async () => {
  scale.value = await getFitScale()
  
  await throttleHandleRender()
}

const download = async () => {
  const uint8 = safeUint8(props.pdfBytes)
  
  const filename = `${ APP_NAME } ${ getTimestamp() }.pdf`
  const { filePath } = await ElectronApp.dialogIpc.showSaveDialog({
    title: '下载 PDF',
    defaultPath: filename,
    filters: [ { name: 'pdf', extensions: [ 'pdf' ] } ],
  })
  
  if (filePath) {
    await fileIpc.writeFile(filePath, uint8)
  }
}


const plusRef = useTemplateRef<ComponentPublicInstance>('plusRef')
const minusRef = useTemplateRef<ComponentPublicInstance>('minusRef')
const plusExecutor = new HoldExecutor(mouseOnly(zoomIn))
const minusExecutor = new HoldExecutor(mouseOnly(zoomOut))
watchEffect(() => {
  const extract = (xxRef: Readonly<ShallowRef<ComponentPublicInstance | null>>, executor: HoldExecutor) => {
    if (xxRef.value) {
      executor.unbindMouseEvents(xxRef.value.$el)
      executor.bindMouseEvents(xxRef.value.$el)
    }
  }
  extract(plusRef, plusExecutor)
  extract(minusRef, minusExecutor)
})
const handleWheel = (e: WheelEvent) => {
  e.deltaY > 0 ? zoomOut() : zoomIn()
}

const handleInput = async (val: string) => {
  if (Number(val) >= pages.value) {
    input.value = String(pages.value)
  }
  if (Number(val) <= 1) {
    input.value = '1'
  }
  current.value = Number(input.value)
  await throttleHandleRender()
}
</script>


<template>
  <div class="container">
    <div class="header">
      <div class="title">PDF 匹配页预览</div>
      
      <div class="pages">
        <var-button text round @click="prevPage" :disabled="current===1">
          <var-icon size="20" name="chevron-left" />
        </var-button>
        
        <div class="indices">
          <span>第</span>
          <var-style-provider
            :style-vars="{
            '--input-input-height': '22px',
            '--input-input-font-size': '14px',
            '--field-decorator-standard-small-non-hint-margin-top': '0'
          }"
          >
            <var-input
              :style="{width:`${width}px`}"
              class="current-page"
              :hint="false"
              :line="true"
              size="small"
              type="number"
              v-model="input"
              @change="handleInput"
              @focus="(e)=>(e.target as HTMLInputElement)?.select()"
            />
          </var-style-provider>
          <span>页 / 共 {{ pages }} 页</span>
        </div>
        
        <var-button text round @click="nextPage" :disabled="current===pages">
          <var-icon size="20" name="chevron-right" />
        </var-button>
      </div>
    </div>
    
    <div class="main">
      <canvas ref="canvas" @wheel.prevent="handleWheel" />
    </div>
    
    <div class="footer">
      <var-button ref="plusRef" text round :disabled="!uploaded">
        <svg-icon name="ResPlus" size="22px" />
      </var-button>
      <var-button ref="minusRef" text round :disabled="scale===.5||!uploaded">
        <svg-icon name="ResMinus" size="22px" />
      </var-button>
      <var-button text round @click="fit" :disabled="!uploaded">
        <svg-icon name="FullScreen" size="22px" />
      </var-button>
      <var-button text round @click="resize" :disabled="!uploaded">
        <svg-icon name="ResReset" size="22px" />
      </var-button>
      <var-button text round @click="download" :disabled="!uploaded">
        <svg-icon name="download" size="22px" />
      </var-button>
    </div>
  </div>

</template>

<style>
.container {
  width: 100%;
  height: 100%;
  border-radius: 8px;
  background: var(--primary-background-color);
  display: flex;
  flex-flow: column nowrap;
  gap: 16px;
  min-width: 0;
  min-height: 0;
  
  .header {
    display: flex;
    flex-flow: row nowrap;
    align-items: center;
    justify-content: space-between;
    padding: 0 8px;
    
    .pages {
      display: flex;
      flex-flow: row nowrap;
      align-items: center;
      gap: 8px;
      
      .indices {
        display: flex;
        flex-flow: row nowrap;
        justify-content: flex-start;
        align-items: center;
        
        .current-page {
          margin: 0 4px;
          
          .var-input__input {
            text-align: center;
          }
        }
      }
    }
  }
  
  .main {
    flex: 1;
    display: flex;
    border-radius: 4px;
    overflow: auto;
    background: rgba(255, 255, 255, .025);
    
    canvas {
      width: 100%;
      height: 100%;
      margin: auto;
    }
  }
  
  .footer {
    height: 36px;
    display: flex;
    flex-flow: row nowrap;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
}
</style>
