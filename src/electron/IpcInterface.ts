import type { AsyncMethodsOf } from '@peiyanlu/ts-utils'
import type { ParsingOptions } from 'xlsx'


export const fileChannel = 'electron-file'


export interface XlsxReadOptions extends Omit<ParsingOptions, 'type'> {}

export interface XlsxRaw {
  [k: string]: string
}

export interface XlsxReadResult {
  key: string
  value: XlsxRaw[]
}

export interface PdfMatchOptions {
  search: string[]
}

export interface PdfMatchResult {
  numPages: number
  matchedPages: number[]
}

export interface PdfExtractOptions {
  matchedPages: number[]
}

export interface PdfExtractResult {
  output: string
}

export interface FileIpcInterface {
  readXlsx(input: string, opts?: XlsxReadOptions): Promise<XlsxReadResult[]>
  
  readXlsx(input: ArrayBuffer, opts?: XlsxReadOptions): Promise<XlsxReadResult[]>
  
  readPdf(input: string, opts: PdfMatchOptions): Promise<PdfMatchResult>
  
  readPdf(input: ArrayBuffer, opts: PdfMatchOptions): Promise<PdfMatchResult>
  
  extractPdf(input: string, opts: PdfExtractOptions): Promise<PdfExtractResult>
  
  extractPdf(input: ArrayBuffer, opts: PdfExtractOptions): Promise<PdfExtractResult>
}

export type FileModuleMethod = AsyncMethodsOf<FileIpcInterface>;
