import type { AsyncMethodsOf } from '@peiyanlu/ts-utils'
import type { ParsingOptions } from 'xlsx'


export const fileChannel = 'electron-file'


export interface XlsxReadOptions extends Omit<ParsingOptions, 'type'> {}

export interface XlsxRaw {
  [k: string]: string
}


export interface XlsxInfo {
  data: { sheetName: string; rowCount: number }[]
  size: string
}

export interface PdfInfo {
  numPages: number
  size: string
}

export interface XlsxReadResult {
  key: string
  value: XlsxRaw[]
}

export interface PdfMatchOptions {
  search: string[]
}

export type PdfMatched = [ string, number ]

export interface PdfMatchResult {
  numPages: number
  matchedPages: PdfMatched[]
  pdfBytes: Uint8Array
}


export interface FileIpcInterface {
  readXlsxInfo(input: ArrayBuffer): Promise<XlsxInfo>
  
  readPdfInfo(input: ArrayBuffer): Promise<PdfInfo>
  
  readXlsx(input: ArrayBuffer, opts?: XlsxReadOptions): Promise<XlsxReadResult[]>
  
  matchPdf(input: ArrayBuffer, opts: PdfMatchOptions): Promise<PdfMatchResult>
  
  readPath(input: string): Promise<ArrayBuffer>
  
  writeFile(output: string, data: Uint8Array): Promise<void>
}

export type FileModuleMethod = AsyncMethodsOf<FileIpcInterface>;
