import dayjs from 'dayjs'
import { app, shell } from 'electron'
import { readFile, writeFile } from 'fs/promises'
import { join, parse } from 'path'
import { PDFDocument } from 'pdf-lib'
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs'
import pdfWorker from 'pdfjs-dist/legacy/build/pdf.worker.mjs?url'
import type { TextItem } from 'pdfjs-dist/types/src/display/api'
import { read, utils } from 'xlsx'
import type {
  FileIpcInterface,
  PdfExtractOptions,
  PdfMatchOptions,
  PdfMatchResult,
  XlsxRaw,
  XlsxReadOptions,
  XlsxReadResult,
} from './IpcInterface'


GlobalWorkerOptions.workerSrc = pdfWorker


export class FileIpcImpl implements FileIpcInterface {
  static readonly instance = new FileIpcImpl()
  
  public async readXlsx(input: string | ArrayBuffer, opts?: XlsxReadOptions): Promise<XlsxReadResult[]> {
    const buffer = typeof input === 'string' ? await readFile(input) : input
    const workbook = read(buffer, { type: 'buffer', ...opts })
    
    return workbook.SheetNames.map((sheetName) => {
      const sheet = workbook.Sheets[sheetName]
      const json = utils.sheet_to_json(sheet, { raw: false }) as XlsxRaw[]
      return { key: sheetName, value: json } as XlsxReadResult
    })
  }
  
  public async readPdf(input: string | ArrayBuffer, opts: PdfMatchOptions): Promise<PdfMatchResult> {
    const { search } = opts
    
    const source = typeof input === 'string' ? { url: input } : { data: input }
    const loadingTask = getDocument({
      ...source,
      disableFontFace: true,
      useSystemFonts: true,
    })
    const pdf = await loadingTask.promise
    
    const matchedPages: number[] = []
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      
      const textArr = (textContent.items as TextItem[])
        .map(item => item?.str ?? '')
        .filter(Boolean)
      const text = textArr.join('')
      
      const hit = search.some(match => text.includes(match))
      if (hit) matchedPages.push(i)
    }
    
    return { numPages: pdf.numPages, matchedPages }
  }
  
  public async extractPdf(input: string | ArrayBuffer, opts: PdfExtractOptions) {
    const originalPdfBytes = typeof input === 'string' ? await readFile(input) : input
    const originalPdf = await PDFDocument.load(originalPdfBytes)
    
    const { matchedPages } = opts
    
    const newPdf = await PDFDocument.create()
    
    for (const pageNum of matchedPages) {
      const [ copiedPage ] = await newPdf.copyPages(originalPdf, [ pageNum - 1 ])
      newPdf.addPage(copiedPage)
    }
    
    const dir = app.getPath('downloads') || app.getPath('desktop')
    
    const { name } = typeof input === 'string' ? parse(input) : { name: 'pdf' }
    const timestamp = dayjs(new Date()).format('YYYY-MM-DD_HH-mm-ss')
    const output = join(dir, `${ name }_${ timestamp }.pdf`)
    const pdfBytes = await newPdf.save()
    
    await writeFile(output, pdfBytes)
    
    shell.showItemInFolder(output)
    
    return { output }
  }
}
