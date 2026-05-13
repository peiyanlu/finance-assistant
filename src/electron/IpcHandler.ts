import { IpcHandler } from '@peiyanlu/electron/backend'
import { FileIpcImpl } from './FileIpcImpl'
import type { FileModuleMethod } from './IpcInterface'
import { fileChannel } from './IpcInterface'


export class ElectronFileHandler extends IpcHandler {
  public get channelName() { return fileChannel }
  
  public async callMethod(method: FileModuleMethod, ...args: any[]) {
    const cmd = FileIpcImpl.instance
    if (!cmd) {
      throw new Error(`No active command`)
    }
    
    const func = (cmd as any)[method] as Function
    if (typeof func === 'function') {
      return func.call(cmd, ...args)
    } else {
      throw new Error(`illegal electron ipc method`)
    }
  }
}
