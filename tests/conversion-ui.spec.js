import { test, expect, _electron as electron } from '@playwright/test'
import { stat } from 'node:fs/promises'
import { fixtures, longSample } from './helpers/media-fixtures'

test('桌面真实转换、结果操作、取消及关闭窗口确认', async () => {
  test.setTimeout(120_000)
  const setup = await fixtures()
  const long = await longSample(setup.engines, setup.directory)
  const env = { ...process.env }
  delete env.ELECTRON_RUN_AS_NODE
  delete env.VIDEOFLOW_DEV_URL
  const app = await electron.launch({ args: ['.'], env })
  let closed = false
  try {
    const page = await app.firstWindow()
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    await expect(page.getByText('桌面连接正常', { exact: true })).toBeVisible()
    const choose = async (file) => {
      await app.evaluate(({ dialog }, selected) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [selected] }) }, file)
      await page.getByRole('button', { name: '选择视频文件', exact: true }).click()
      await expect(page.getByRole('button', { name: '开始转换', exact: true })).toBeEnabled()
    }
    await choose(setup.input)
    await app.evaluate(({ dialog }, directory) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [directory] }) }, setup.directory)
    await page.getByRole('button', { name: '选择输出路径', exact: true }).click()
    await page.getByLabel('输出格式', { exact: true }).selectOption('MKV')
    await page.getByRole('button', { name: '开始转换', exact: true }).click()
    await expect(page.getByText('已完成', { exact: true })).toBeVisible({ timeout: 30_000 })
    const snapshot = await page.evaluate(async () => (await window.videoFlow.getStatus()).data.media)
    expect((await stat(snapshot.tasks[0].outputPath)).size).toBeGreaterThan(0)
    await app.evaluate(({ shell }) => {
      globalThis.resultOpens = []
      shell.openPath = async (file) => { globalThis.resultOpens.push(['file', file]); return '' }
      shell.showItemInFolder = (file) => { globalThis.resultOpens.push(['folder', file]) }
    })
    await page.getByRole('button', { name: '打开文件', exact: true }).click()
    await page.getByRole('button', { name: '打开文件夹', exact: true }).click()
    expect(await app.evaluate(() => globalThis.resultOpens)).toEqual([['file', snapshot.tasks[0].outputPath], ['folder', snapshot.tasks[0].outputPath]])
    expect((await page.evaluate(() => window.videoFlow.startConversion('invalid-id', 'MP4'))).ok).toBe(false)
    await page.mouse.move(600, 45)
    await page.screenshot({ path: 'screenshots/phase2-completed.png', fullPage: true, animations: 'disabled' })
    await page.getByRole('button', { name: '转换记录', exact: true }).click()
    await expect(page.getByText('已完成', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: '视频转换', exact: true }).click()
    await choose(long)
    await page.getByLabel('输出格式', { exact: true }).selectOption('WEBM')
    await page.getByRole('button', { name: '开始转换', exact: true }).click()
    await expect(page.getByText('转换中', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: '选择视频文件', exact: true })).toBeDisabled()
    await page.getByRole('button', { name: '取消转换', exact: true }).click()
    await expect(page.getByText('已取消', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: '开始转换', exact: true }).click()
    await expect(page.getByText('转换中', { exact: true })).toBeVisible()
    await app.evaluate(({ dialog, BrowserWindow }) => { dialog.showMessageBox = async () => ({ response: 0 }); BrowserWindow.getAllWindows()[0].close() })
    await expect(page.getByText('转换中', { exact: true })).toBeVisible()
    const exiting = app.waitForEvent('close')
    await app.evaluate(({ dialog, BrowserWindow }) => { dialog.showMessageBox = async () => ({ response: 1 }); BrowserWindow.getAllWindows()[0].close() })
    await exiting
    closed = true
    expect(errors).toEqual([])
  } finally { if (!closed) { await app.evaluate(({ dialog }) => { dialog.showMessageBox = async () => ({ response: 1 }) }).catch(() => {}); await app.close() } }
})
