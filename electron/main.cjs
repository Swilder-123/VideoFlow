const { app, BrowserWindow, ipcMain, dialog, shell, screen } = require('electron')
const path = require('node:path')
const fs = require('node:fs/promises')
const { pathToFileURL } = require('node:url')
const { detectEngines } = require('./media/engines.cjs')
const { MediaService, extensions } = require('./media/service.cjs')
const { userError } = require('./media/process.cjs')

let mainWindow
let outputDirectory
let media
let dialogBusy = false
let allowClose = false
let closing = false
const devUrl = !app.isPackaged && process.env.VIDEOFLOW_DEV_URL === 'http://127.0.0.1:5173'
  ? process.env.VIDEOFLOW_DEV_URL : null
const pageUrl = pathToFileURL(path.join(__dirname, '../dist/index.html')).href

function registerHandler(channel, handler) {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      if (event.sender !== mainWindow?.webContents || event.senderFrame !== event.sender.mainFrame ||
        (devUrl ? new URL(event.senderFrame.url).origin !== devUrl : event.senderFrame.url !== pageUrl)) {
        return { ok: false, error: '无法处理来自此页面的请求。' }
      }
      if (closing) throw userError('应用正在关闭，请稍候。')
      return { ok: true, data: await handler(...args) }
    } catch (error) {
      console.error(`[${channel}]`, error)
      return { ok: false, error: error.userMessage || '操作未完成，请重试并检查文件或目录是否可访问。' }
    }
  })
}

function reject(message) { throw Object.assign(new Error(message), { userMessage: message }) }

async function choose(options) {
  media.assertIdle()
  if (dialogBusy) reject('文件选择窗口已打开，请先完成当前选择。')
  dialogBusy = true
  try { return await dialog.showOpenDialog(mainWindow, options) }
  finally { dialogBusy = false }
}

async function requestClose(event) {
  if (allowClose) return
  event.preventDefault()
  if (closing) return
  closing = true
  try {
    if (media.active) {
      const result = await dialog.showMessageBox(mainWindow, {
        type: 'question', title: '转换尚未完成', message: '退出会取消当前转换任务。',
        detail: '已完成的文件会保留，未完成的临时文件将被清理。',
        buttons: ['继续转换', '取消任务并退出'], defaultId: 0, cancelId: 0, noLink: true,
      })
      if (result.response !== 1) return
    }
    await media.dispose()
    allowClose = true
    mainWindow?.close()
  } finally { closing = false }
}

function createWindow() {
  const available = screen.getPrimaryDisplay().workAreaSize
  mainWindow = new BrowserWindow({
    width: Math.min(1440, available.width), height: Math.min(900, available.height), minWidth: 920, minHeight: 640,
    icon: path.join(__dirname, '../build/icon.png'),
    title: 'VideoFlow 视频格式转换器', backgroundColor: '#f0f4f8',
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#f0f4f8', symbolColor: '#162238', height: 42 },
    autoHideMenuBar: true, show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true,
    },
  })
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  mainWindow.webContents.on('will-navigate', (event) => event.preventDefault())
  mainWindow.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false))
  mainWindow.once('ready-to-show', () => mainWindow.show())
  mainWindow.on('close', requestClose)
  mainWindow.on('closed', () => { mainWindow = null })
  const loading = devUrl ? mainWindow.loadURL(devUrl) : mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  loading.catch((error) => {
    console.error(error)
    dialog.showErrorBox('VideoFlow 启动失败', app.isPackaged ? '客户端文件缺失或损坏，请重新安装 VideoFlow。' : '客户端页面加载失败，请运行 npm.cmd run build 或 npm.cmd run dev。')
    app.quit()
  })
}

app.whenReady().then(async () => {
  outputDirectory = app.getPath('videos')
  media = new MediaService(await detectEngines({ root: path.join(__dirname, '..'), resourcesPath: process.resourcesPath, isPackaged: app.isPackaged }))
  media.on('change', (snapshot) => {
    if (mainWindow && !mainWindow.webContents.isDestroyed()) mainWindow.webContents.send('media:changed', snapshot)
  })
  registerHandler('app:status', () => ({
    name: 'VideoFlow', version: app.getVersion(), platform: process.platform,
    electron: process.versions.electron, outputDirectory, engines: media.engines, media: media.snapshot(), isPackaged: app.isPackaged,
  }))
  registerHandler('video:select', async () => {
    const result = await choose({
      title: '选择视频文件', properties: ['openFile'],
      filters: [{ name: '视频文件', extensions }],
    })
    return result.canceled ? null : media.importFile(result.filePaths[0])
  })
  registerHandler('video:drop', (filePath) => {
    if (dialogBusy) reject('请先关闭文件选择窗口。')
    return media.importFile(filePath)
  })
  registerHandler('video:remove', () => media.removeVideo())
  registerHandler('task:start', (request) => {
    if (dialogBusy) reject('请先关闭文件选择窗口。')
    if (!request || typeof request.videoId !== 'string' || typeof request.format !== 'string') reject('转换参数无效。')
    return media.start({ videoId: request.videoId, format: request.format }, outputDirectory)
  })
  registerHandler('task:cancel', (id) => { if (typeof id !== 'string') reject('任务参数无效。'); return media.cancel(id) })
  registerHandler('task:clear', () => media.clearTasks())
  registerHandler('task:open', async (id, kind) => {
    if (typeof id !== 'string' || !['file', 'folder'].includes(kind)) reject('任务参数无效。')
    const resultPath = media.resultPath(id)
    try { await fs.access(resultPath) } catch { reject('结果文件已移动或删除。') }
    if (kind === 'folder') shell.showItemInFolder(resultPath)
    else if (await shell.openPath(resultPath)) reject('无法打开结果文件，请检查默认视频播放器。')
  })
  registerHandler('output:select', async () => {
    const result = await choose({
      title: '选择输出目录', defaultPath: outputDirectory,
      properties: ['openDirectory', 'createDirectory'],
    })
    if (result.canceled) return null
    const selected = result.filePaths[0]
    try { await fs.access(selected, require('node:fs').constants.W_OK) }
    catch { reject('此目录不可写，请选择其他输出目录。') }
    outputDirectory = selected
    return selected
  })
  registerHandler('output:open', async () => {
    const error = await shell.openPath(outputDirectory)
    if (error) reject('无法打开输出目录，请重新选择一个可访问的目录。')
  })
  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
