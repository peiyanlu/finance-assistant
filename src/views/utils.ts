import dayjs from 'dayjs'


export const arrayUniqueByKey = <T>(array: T[], key: keyof T): T[] => {
  return Array
    .from(
      array.reduce(
          (map, item) => {
            map.set(item[key], item)
            return map
          },
          new Map(),
        )
        .values(),
    )
}

export const isValidDate = (value: string) => {
  return dayjs(value, 'YYYY-MM-DD', true).isValid()
}

export const getTimestamp = (format= 'YYYY-MM-DD_HH-mm-ss') => {
  return dayjs(new Date()).format(format)
}

export const getTextWidth = (text: string) => {
  // 中文更宽，所以简单按字符数估算
  let len = 0
  for (const char of text) {
    // 中文 / 全角字符
    if (/[^\x00-\xff]/.test(char)) {
      len += 2
    } else {
      len += 1
    }
  }
  return len
}

export const getColumnMinWidth = (text: string, pad = 0) => {
  const len = getTextWidth(text)
  const width = len * 12 + pad
  return Math.min(Math.max(width, 120), 200)
}

export const dateNow = () => {
  return dayjs(new Date()).format('YYYY-MM-DD HH-mm-ss')
}

export const readFieAsArrayBuffer = (file: File) => {
  return new Promise<ArrayBuffer>((resolve) => {
    const reader = new FileReader()
    reader.onloadend = (evt) => resolve(evt.target?.result as ArrayBuffer)
    reader.readAsArrayBuffer(file)
  })
}

export const safeUint8 = (data: ArrayBuffer | Uint8Array) => {
  if (data instanceof Uint8Array) {
    return new Uint8Array(data)
  }
  return new Uint8Array(data.slice(0))
}

export const downloadUint8Array = (data: Uint8Array, filename: string) => {
  const blob = new Blob([ new Uint8Array(data.slice(0)) ], { type: 'application/octet-stream' })
  
  const url = URL.createObjectURL(blob)
  
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  
  URL.revokeObjectURL(url)
}
