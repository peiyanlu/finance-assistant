import { shell } from 'electron'
import { readFile, writeFile } from 'fs/promises'
import { PDFDocument } from 'pdf-lib'
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs'
import pdfWorker from 'pdfjs-dist/legacy/build/pdf.worker.mjs?url'
import { read, utils } from 'xlsx'
import type {
  FileIpcInterface,
  PdfInfo,
  PdfMatched,
  PdfMatchOptions,
  PdfMatchResult,
  XlsxInfo,
  XlsxRaw,
  XlsxReadOptions,
  XlsxReadResult,
} from './IpcInterface'


GlobalWorkerOptions.workerSrc = pdfWorker

const getSize = (data: File | Blob | ArrayBuffer | Uint8Array | Buffer): number => {
  if ('size' in data) {
    return data.size
  }
  return data.byteLength
}

const safeUint8 = (data: ArrayBuffer | Uint8Array) => {
  if (data instanceof Uint8Array) {
    return new Uint8Array(data)
  }
  return new Uint8Array(data.slice(0))
}

const formatSize = (bytes: number) => {
  if (bytes < 1024) {
    return `${ bytes } B`
  }
  if (bytes < 1024 * 1024) {
    return `${ (bytes / 1024).toFixed(2) } KB`
  }
  return `${ (bytes / 1024 / 1024).toFixed(2) } MB`
}


const extractPdf = async (unit8: Uint8Array, indices: number[]) => {
  const pdf = await PDFDocument.load(unit8)
  const newPdf = await PDFDocument.create()
  
  const pages = await newPdf.copyPages(pdf, indices)
  pages.forEach(page => newPdf.addPage(page))
  
  return newPdf.save()
}

export class FileIpcImpl implements FileIpcInterface {
  static readonly instance = new FileIpcImpl()
  
  public async readXlsxInfo(input: ArrayBuffer): Promise<XlsxInfo> {
    const workbook = read(input, { type: 'buffer' })
    const data = workbook.SheetNames.map(sheetName => {
      const sheet = workbook.Sheets[sheetName]
      const rows = utils.sheet_to_json(sheet)
      return { sheetName, rowCount: rows.length }
    })
    
    const size = formatSize(getSize(input))
    
    return { data, size }
  }
  
  public async readPdfInfo(input: ArrayBuffer): Promise<PdfInfo> {
    const loadingTask = getDocument({
      data: safeUint8(input),
      disableFontFace: true,
      useSystemFonts: true,
    })
    const pdf = await loadingTask.promise
    
    const size = formatSize(getSize(input))
    
    return { numPages: pdf.numPages, size }
  }
  
  public async readXlsx(input: ArrayBuffer, opts?: XlsxReadOptions): Promise<XlsxReadResult[]> {
    const workbook = read(input, { type: 'buffer', ...opts })
    
    return workbook.SheetNames.map((sheetName) => {
      const sheet = workbook.Sheets[sheetName]
      const json = utils.sheet_to_json(sheet, { raw: false }) as XlsxRaw[]
      return { key: sheetName, value: json } as XlsxReadResult
    })
  }
  
  public async matchPdf(input: ArrayBuffer, opts: PdfMatchOptions): Promise<PdfMatchResult> {
    const { search } = opts
    const loadingTask = getDocument({
      data: safeUint8(input),
      disableFontFace: true,
      useSystemFonts: true,
    })
    const pdf = await loadingTask.promise
    
    const matchedPages: PdfMatched[] = []
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      
      const textArr = textContent.items
        .filter((item) => 'str' in item)
        .map(item => item.str)
        .filter(Boolean)
      const text = textArr.join('')
      
      const index = search.findIndex(match => text.includes(match))
      if (~index) {
        matchedPages.push([ search[index], i ])
      }
    }
    
    const originalPdfBytes = typeof input === 'string' ? await readFile(input) : input
    const indices = matchedPages.map(([ _v, i ]) => i - 1)
    
    const pdfBytes = await extractPdf(safeUint8(originalPdfBytes), indices)
    const numPages = matchedPages.length
    
    return { numPages, matchedPages, pdfBytes }
  }
  
  public async readPath(input: string): Promise<ArrayBuffer> {
    const buffer = await readFile(input)
    return Uint8Array.from(buffer).buffer
  }
  
  public async writeFile(output: string, data: Uint8Array, focus = true): Promise<void> {
    await writeFile(output, data)
    focus && shell.showItemInFolder(output)
  }
  
}
