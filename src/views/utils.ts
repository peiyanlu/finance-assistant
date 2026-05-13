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
