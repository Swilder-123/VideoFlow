const { contextBridge, ipcRenderer, webUtils } = require('electron')

contextBridge.exposeInMainWorld('videoFlow', Object.freeze({
  getStatus: () => ipcRenderer.invoke('app:status'),
  selectVideo: () => ipcRenderer.invoke('video:select'),
  importDroppedFile: (file) => ipcRenderer.invoke('video:drop', webUtils.getPathForFile(file)),
  selectOutputDirectory: () => ipcRenderer.invoke('output:select'),
  openOutputDirectory: () => ipcRenderer.invoke('output:open'),
  removeVideo: () => ipcRenderer.invoke('video:remove'),
  startConversion: (videoId, format) => ipcRenderer.invoke('task:start', { videoId, format }),
  cancelConversion: (id) => ipcRenderer.invoke('task:cancel', id),
  clearTasks: () => ipcRenderer.invoke('task:clear'),
  openResult: (id, kind) => ipcRenderer.invoke('task:open', id, kind),
  onMediaChanged: (callback) => {
    if (typeof callback !== 'function') throw new TypeError('需要回调函数')
    const listener = (_event, snapshot) => callback(snapshot)
    ipcRenderer.on('media:changed', listener)
    return () => ipcRenderer.removeListener('media:changed', listener)
  },
}))
