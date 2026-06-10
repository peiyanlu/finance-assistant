export class HoldExecutor {
  private intervalId: NodeJS.Timeout | null = null
  private timeoutId: NodeJS.Timeout | null = null
  private readonly interval: number // 连续触发的时间间隔
  private readonly longPressThreshold: number// 用于设置长按的触发时间
  private readonly clickTimeout: number // 用于检测单击的超时时间
  private readonly callback: (event: MouseEvent | KeyboardEvent) => void
  private readonly clickCallback: (event: MouseEvent | KeyboardEvent) => void
  private readonly keys: Set<string> | null // 用于存储多个键；若为 null，监听所有键
  private keyPressTime: number = 0 // 记录按键按下的时间
  private mousePressTime: number = 0 // 记录鼠标按下的时间
  
  constructor(
    callback: (event: MouseEvent | KeyboardEvent) => void,
    interval: number = 100,
    longPressThreshold: number = 200,
    keys: string[] | null = null,
  ) {
    this.callback = callback
    this.clickCallback = callback
    this.interval = interval
    this.longPressThreshold = longPressThreshold
    this.clickTimeout = longPressThreshold
    this.keys = keys ? new Set(keys) : null
  }
  
  // 绑定鼠标事件
  public bindMouseEvents(target: HTMLElement | Document) {
    target.addEventListener('mousedown', (event: Event) => this.handleMousePress(event))
    target.addEventListener('mouseup', (event: Event) => this.handleRelease(event))
    target.addEventListener('mouseleave', () => this.stopLongPress()) // 鼠标移出目标时也停止
  }
  
  // 解绑鼠标事件
  public unbindMouseEvents(target: HTMLElement | Document) {
    target.removeEventListener('mousedown', (event: Event) => this.handleMousePress(event))
    target.removeEventListener('mouseup', (event: Event) => this.handleRelease(event))
    target.removeEventListener('mouseleave', () => this.stopLongPress())
  }
  
  private allowKeyboard(event: KeyboardEvent): boolean {
    return this.keys === null || this.keys.has(event.key)
  }
  
  // 绑定键盘事件
  public bindKeyboardEvents(target: HTMLElement | Document) {
    // 监听 keydown 事件
    target.addEventListener('keydown', (e: Event) => {
      const event = e as KeyboardEvent
      if (this.allowKeyboard(event) && this.timeoutId === null) {
        this.handleKeyPress(event)
      }
    })
    
    // 监听 keyup 事件
    target.addEventListener('keyup', (e: Event) => {
      const event = e as KeyboardEvent
      if (this.allowKeyboard(event)) {
        this.handleRelease(event)
      }
    })
    
    // 监听窗口失去焦点事件（解决 Alt+Tab 导致键卡住的问题）
    window.addEventListener('blur', () => {
      this.stopLongPress() // 当窗口失去焦点时，清除所有活动的操作
    })
  }
  
  // 解绑键盘事件
  public unbindKeyboardEvents(target: HTMLElement | Document) {
    target.removeEventListener('keydown', (e: Event) => {
      const event = e as KeyboardEvent
      if (this.allowKeyboard(event)) {
        this.handleKeyPress(event)
      }
    })
    target.removeEventListener('keyup', (e: Event) => {
      const event = e as KeyboardEvent
      if (this.allowKeyboard(event)) {
        this.handleRelease(event)
      }
    })
    window.removeEventListener('blur', () => {
      this.stopLongPress()
    })
  }
  
  // 开始执行长按检测
  private startLongPress(event: MouseEvent | KeyboardEvent) {
    // 设置延迟触发长按
    this.timeoutId = setTimeout(() => {
      // 立即执行一次长按回调
      this.callback(event)
      
      // 然后开始每隔 interval 时间执行回调
      this.intervalId = setInterval(() => {
        this.callback(event)
      }, this.interval)
    }, this.longPressThreshold)
  }
  
  // 停止长按执行
  private stopLongPress() {
    // 清除延迟和重复执行的定时器
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId)
      this.timeoutId = null
    }
    if (this.intervalId !== null) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }
  
  // 处理单击和长按
  private handleKeyPress(event: KeyboardEvent) {
    this.keyPressTime = Date.now() // 记录按键按下的时间
    this.startLongPress(event) // 开始长按检测
  }
  
  private handleMousePress(e: Event) {
    const event = e as MouseEvent
    this.mousePressTime = Date.now() // 记录鼠标按下的时间
    this.startLongPress(event) // 开始长按检测
  }
  
  private handleRelease(event: Event) {
    const pressDuration = Date.now() - (event instanceof KeyboardEvent ? this.keyPressTime : this.mousePressTime) // 计算按键或鼠标按下的时间
    
    this.stopLongPress() // 停止长按检测
    
    // 如果按键或鼠标按下的时间小于单击超时时间，则认为是单击
    if (pressDuration < this.clickTimeout) {
      this.clickCallback(event as (MouseEvent | KeyboardEvent)) // 执行单击回调
    }
  }
}


export const keyboardOnly = (handler: (e: KeyboardEvent) => void) => {
  return (e: MouseEvent | KeyboardEvent) => {
    if (e instanceof KeyboardEvent) {
      handler(e)
    }
  }
}

export const mouseOnly = (handler: (e: MouseEvent) => void) => {
  return (e: MouseEvent | KeyboardEvent) => {
    if (e instanceof MouseEvent) {
      handler(e)
    }
  }
}
