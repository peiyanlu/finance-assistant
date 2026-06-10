import { IpcHandler } from '@peiyanlu/electron/backend'
import { FileIpcImpl } from './FileIpcImpl'
import { fileChannel, FileIpcInterface, FileModuleMethod } from './IpcInterface'


export class ElectronFileHandler extends IpcHandler {
  public get channelName() { return fileChannel }
  
  public async callMethod(
    method: FileModuleMethod,
    ...args: Parameters<FileIpcInterface[FileModuleMethod]>[]
  ): Promise<ReturnType<FileIpcInterface[FileModuleMethod]>> {
    const cmd = FileIpcImpl.instance
    if (!cmd) {
      throw new Error(`No active command`)
    }
    
    const func = cmd[method] as Function
    if (typeof func !== 'function') {
      throw new Error(`illegal electron ipc method`)
    }
    
    return func.call(cmd, ...args)
  }
}
