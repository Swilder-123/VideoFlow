import { test, expect, _electron as electron } from '@playwright/test'
import { mkdtemp, writeFile, rm, mkdir, copyFile } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { createServer } from 'vite'
import { fixtures } from './helpers/media-fixtures'

test('桌面启动、真实 IPC、文件边界、页面状态与窗口适配', async () => {
  const env = { ...process.env }
  delete env.ELECTRON_RUN_AS_NODE
  delete env.VIDEOFLOW_DEV_URL
  const launchOptions = process.env.VIDEOFLOW_TEST_EXE
    ? { executablePath: process.env.VIDEOFLOW_TEST_EXE, args: [] }
    : { args: ['.'] }
  const app = await electron.launch({ ...launchOptions, env })
  const fixtureDir = await mkdtemp(path.join(os.tmpdir(), 'videoflow-test-'))
  const errors = []
  try {
    const page = await app.firstWindow()
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
    await expect(page.getByRole('heading', { name: '视频格式转换', exact: true })).toBeVisible()
    await expect(page.getByText('桌面连接正常', { exact: true })).toBeVisible()
    expect(page.url()).toMatch(/^file:/)
    await expect.poll(() => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isVisible())).toBe(true)
    const preferences = await app.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0]
      const prefs = win.webContents.getLastWebPreferences()
      return { visible: win.isVisible(), contextIsolation: prefs.contextIsolation, nodeIntegration: prefs.nodeIntegration, sandbox: prefs.sandbox }
    })
    expect(preferences).toEqual({ visible: true, contextIsolation: true, nodeIntegration: false, sandbox: true })
    expect(await page.evaluate(() => ({ require: typeof window.require, process: typeof window.process }))).toEqual({ require: 'undefined', process: 'undefined' })
    const status = await page.evaluate(() => window.videoFlow.getStatus())
    expect(status.ok).toBe(true)
    expect(status.data.platform).toBe('win32')
    await expect(page.getByRole('button', { name: '开始转换', exact: true })).toBeDisabled()
    await expect(page.getByText('还没有转换任务', { exact: true })).toBeVisible()
    await mkdir('screenshots', { recursive: true })
    await page.mouse.move(600, 45)
    await page.screenshot({ path: 'screenshots/convert.png', fullPage: true, animations: 'disabled' })

    // Automate only the native dialog return boundary. Files and IPC are real.
    // Phase two uses a legally generated, real video fixture for all positive paths.
    const selected = path.join(fixtureDir, '中文 空格 文件.MP4')
    const generated = await fixtures()
    await copyFile(generated.input, selected)
    const selectResult = async (filePaths, canceled = false, delay = 0) => {
      await app.evaluate(({ dialog }, result) => {
        dialog.showOpenDialog = async () => {
          await new Promise((resolve) => setTimeout(resolve, result.delay))
          return { filePaths: result.filePaths, canceled: result.canceled }
        }
      }, { filePaths, canceled, delay })
      await page.getByRole('button', { name: '选择视频文件', exact: true }).click()
    }
    await selectResult([selected], false, 700)
    await expect(page.getByRole('button', { name: '等待文件选择…', exact: true })).toBeDisabled()
    await expect(page.getByText('中文 空格 文件.MP4', { exact: true })).toBeVisible()
    await expect(page.getByText('320 × 180', { exact: true })).toBeVisible()
    await expect(page.getByAltText('当前视频缩略图')).toBeVisible()
    await expect(page.getByRole('button', { name: '开始转换', exact: true })).toBeEnabled()
    await selectResult([], true)
    await expect(page.getByText('中文 空格 文件.MP4', { exact: true })).toBeVisible()
    await selectResult([path.join(fixtureDir, '不支持.txt')])
    await expect(page.getByRole('alert')).toContainText('暂不支持此文件类型')
    await expect(page.getByText('中文 空格 文件.MP4', { exact: true })).toBeVisible()
    const empty = path.join(fixtureDir, '空.mp4')
    await writeFile(empty, '')
    await selectResult([empty])
    await expect(page.getByRole('alert')).toContainText('该文件为空')
    await selectResult([path.join(fixtureDir, '不存在.mp4')])
    await expect(page.getByRole('alert')).toContainText('无法读取文件')
    await page.getByRole('button', { name: '关闭错误提示' }).click()
    await page.getByRole('button', { name: '移除文件', exact: true }).click()
    await expect(page.getByText('未选择文件', { exact: true })).toBeVisible()
    const cdp = await page.context().newCDPSession(page)
    const dropBox = await page.locator('.import-zone').boundingBox()
    const drag = { x: dropBox.x + 60, y: dropBox.y + 60, data: { items: [], files: [selected], dragOperationsMask: 1 } }
    await cdp.send('Input.dispatchDragEvent', { type: 'dragEnter', ...drag })
    await cdp.send('Input.dispatchDragEvent', { type: 'dragOver', ...drag })
    await cdp.send('Input.dispatchDragEvent', { type: 'drop', ...drag })
    await expect(page.getByText('中文 空格 文件.MP4', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: '移除文件', exact: true }).click()
    await cdp.detach()
    const emptyTransfer = await page.evaluateHandle(() => new DataTransfer())
    await page.locator('.import-zone').dispatchEvent('drop', { dataTransfer: emptyTransfer })
    await emptyTransfer.dispose()
    await expect(page.getByRole('alert')).toContainText('一次只能选择一个视频文件')
    await page.getByRole('button', { name: '关闭错误提示' }).click()
    await page.getByLabel('输出格式', { exact: true }).selectOption('WEBM')
    await expect(page.getByLabel('输出格式', { exact: true })).toHaveValue('WEBM')

    await app.evaluate(({ dialog }, dir) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [dir] }) }, fixtureDir)
    await page.getByRole('button', { name: '选择输出路径', exact: true }).click()
    await expect(page.getByLabel('输出路径', { exact: true })).toHaveValue(fixtureDir)
    await app.evaluate(({ dialog }, dir) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [dir] }) }, status.data.outputDirectory)
    await page.getByRole('button', { name: '选择输出路径', exact: true }).click()
    await expect(page.getByLabel('输出路径', { exact: true })).toHaveValue(status.data.outputDirectory)
    await page.getByLabel('输出格式', { exact: true }).selectOption('MP4')
    await page.getByRole('button', { name: '转换记录', exact: true }).click()
    await expect(page.getByText('暂无转换记录', { exact: true })).toBeVisible()
    await page.mouse.move(600, 45)
    await page.screenshot({ path: 'screenshots/history.png', fullPage: true, animations: 'disabled' })
    await page.getByRole('button', { name: '设置', exact: true }).click()
    await expect(page.getByRole('heading', { name: '视频处理引擎' })).toBeVisible()
    await page.getByRole('button', { name: '检查连接', exact: true }).click()
    await expect(page.getByText(/主进程已响应/)).toBeVisible()
    await page.mouse.move(600, 45)
    await page.screenshot({ path: 'screenshots/settings.png', fullPage: true, animations: 'disabled' })
    await page.getByRole('button', { name: '视频转换', exact: true }).click()

    for (const [width, height] of [[920, 640], [1280, 720], [1366, 768], [1536, 1024]]) {
      await app.evaluate(({ BrowserWindow }, size) => BrowserWindow.getAllWindows()[0].setSize(...size), [width, height])
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
      await expect(page.getByRole('button', { name: '选择视频文件', exact: true })).toBeVisible()
      const rail = await page.locator('.sidebar').boundingBox()
      await page.locator('.workspace').evaluate((el) => { el.scrollTop = el.scrollHeight })
      expect(await page.evaluate(() => document.documentElement.scrollTop)).toBe(0)
      expect(await page.locator('.sidebar').boundingBox()).toEqual(rail)
      await page.locator('.workspace').evaluate((el) => { el.scrollTop = 0 })
      await page.screenshot({ path: `screenshots/convert-${width}.png`, fullPage: true, animations: 'disabled' })
    }
    // Untrusted child frames must not use the exposed privileged IPC.
    const frameBlocked = await app.evaluate(async ({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0]
      await win.webContents.executeJavaScript(`new Promise(resolve => { const frame = document.createElement('iframe'); frame.src = 'about:blank'; frame.onload = resolve; document.body.append(frame) })`)
      const frame = win.webContents.mainFrame.frames[0]
      const result = await frame.executeJavaScript('typeof window.videoFlow')
      await win.webContents.executeJavaScript(`document.querySelector('iframe').remove()`)
      return result
    })
    expect(frameBlocked).toBe('undefined')
    expect(errors).toEqual([])
  } finally {
    await app.close()
    if (path.dirname(fixtureDir) === path.resolve(os.tmpdir()) && path.basename(fixtureDir).startsWith('videoflow-test-')) {
      await rm(fixtureDir, { recursive: true, force: true })
    }
  }
})

test('开发页面通过 Vite 加载且桌面通信正常', async () => {
  test.skip(!!process.env.VIDEOFLOW_TEST_EXE, '打包程序只验证本地生产页面')
  const server = await createServer()
  let app
  try {
    await server.listen()
    const env = { ...process.env, VIDEOFLOW_DEV_URL: 'http://127.0.0.1:5173' }
    delete env.ELECTRON_RUN_AS_NODE
    app = await electron.launch({ args: ['.'], env })
    const page = await app.firstWindow()
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    await expect(page.getByText('桌面连接正常', { exact: true })).toBeVisible()
    expect(page.url()).toBe('http://127.0.0.1:5173/')
    await expect.poll(() => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isVisible())).toBe(true)
    await expect(page.getByRole('button', { name: '开始转换', exact: true })).toBeDisabled()
    expect(errors).toEqual([])
  } finally { await app?.close(); await server.close() }
})
