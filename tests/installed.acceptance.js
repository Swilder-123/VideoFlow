import { test, expect, _electron as electron } from '@playwright/test'
import { mkdir, mkdtemp, stat, readdir, readFile, writeFile } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { createHash } from 'node:crypto'
import path from 'node:path'
import os from 'node:os'
import { run, longSample } from './helpers/media-fixtures'
const execute = promisify(execFile)

test('独立安装版：原生选择、内置引擎、双向转换、真实进度、取消、退出与重启', async () => {
  const exe = process.env.VIDEOFLOW_TEST_EXE
  if (!exe || !path.isAbsolute(exe)) throw new Error('请设置 VIDEOFLOW_TEST_EXE 为安装后的 VideoFlow.exe 绝对路径')
  const install = path.dirname(exe)
  expect(install.startsWith(process.cwd())).toBe(false)
  const base = process.env.VIDEOFLOW_ACCEPTANCE_ROOT || os.tmpdir()
  await mkdir(base, { recursive: true })
  const directory = await mkdtemp(path.join(base, 'videoflow-installed-'))
  const engines = Object.fromEntries(['ffmpeg', 'ffprobe'].map((name) => [name, { path: path.join(install, 'resources', 'ffmpeg', `${name}.exe`) }]))
  const manifest = JSON.parse(await readFile(path.join(install, 'resources/licenses/engine-manifest.json'), 'utf8'))
  for (const name of Object.keys(engines)) {
    const hash = createHash('sha256').update(await readFile(engines[name].path)).digest('hex')
    expect(hash).toBe(manifest.engines[name].sha256)
  }
  const input = path.join(directory, '中文 空格 独立安装验收.mp4')
  await run(engines.ffmpeg.path, ['-v', 'error', '-nostdin', '-n', '-f', 'lavfi', '-i', 'testsrc2=size=320x180:rate=24', '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000', '-t', '3', '-c:v', 'libx264', '-threads', '2', '-pix_fmt', 'yuv420p', '-c:a', 'aac', input])
  const long = await longSample(engines, directory)
  const env = { ...process.env, PATH: path.join(process.env.SystemRoot, 'System32'), VIDEOFLOW_FFMPEG_PATH: 'Z:\\missing\\ffmpeg.exe', VIDEOFLOW_FFPROBE_PATH: 'Z:\\missing\\ffprobe.exe' }
  for (const key of ['ELECTRON_RUN_AS_NODE', 'VIDEOFLOW_DEV_URL', 'NODE_PATH', 'NODE_OPTIONS']) delete env[key]
  const launch = () => electron.launch({ executablePath: exe, args: [], cwd: install, env })
  let app = await launch()
  const errors = []
  const shellResults = []
  const outputs = []
  const helper = path.resolve('scripts/select-native-file.ps1')
  try {
    let page = await app.firstWindow()
    page.on('pageerror', (error) => errors.push(error.message))
    await expect(page.getByText('桌面连接正常', { exact: true })).toBeVisible()
    const status = await page.evaluate(() => window.videoFlow.getStatus())
    expect(status.data).toMatchObject({ isPackaged: true, version: '0.3.0' })
    expect(await app.evaluate(({ app }) => app.getAppPath())).toBe(path.join(install, 'resources/app.asar'))
    for (const name of Object.keys(engines)) expect(status.data.engines[name]).toMatchObject({ available: true, path: engines[name].path })
    const chooseNative = async (file) => {
      await page.getByRole('button', { name: '选择视频文件', exact: true }).click()
      const mainPid = await app.evaluate(() => process.pid)
      await execute('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', helper, '-ApplicationProcessId', String(mainPid), '-FilePath', file], { windowsHide: true, timeout: 20_000 })
      await expect(page.getByRole('button', { name: '开始转换', exact: true })).toBeEnabled()
      await expect(page.getByAltText('当前视频缩略图')).toBeVisible()
    }
    await chooseNative(input)
    await expect(page.locator('dd').filter({ hasText: /^MP4$/ })).toBeVisible()
    // Only output-folder dialog selection is substituted. Video picker and OS result opening remain native.
    await app.evaluate(({ dialog }, dir) => {
      const original = dialog.showOpenDialog.bind(dialog)
      dialog.showOpenDialog = (...args) => args.at(-1).properties.includes('openDirectory') ? Promise.resolve({ canceled: false, filePaths: [dir] }) : original(...args)
    }, directory)
    await page.getByRole('button', { name: '选择输出路径', exact: true }).click()
    const convert = async (format) => {
      await page.getByLabel('输出格式', { exact: true }).selectOption(format)
      await page.getByRole('button', { name: '开始转换', exact: true }).click()
      await expect.poll(async () => (await page.evaluate(() => window.videoFlow.getStatus())).data.media.tasks[0]?.status, { timeout: 30_000 }).toBe('completed')
      const task = (await page.evaluate(() => window.videoFlow.getStatus())).data.media.tasks[0]
      expect((await stat(task.outputPath)).size).toBeGreaterThan(0)
      await run(engines.ffmpeg.path, ['-v', 'error', '-xerror', '-i', task.outputPath, '-f', 'null', '-'], { timeout: 20_000 })
      outputs.push(task.outputPath)
      return task
    }
    const mkv = await convert('MKV')
    await chooseNative(mkv.outputPath)
    await expect(page.locator('dd').filter({ hasText: /^MKV$/ })).toBeVisible()
    const mp4 = await convert('MP4')
    // Real shell calls: no mocked success. OS acceptance is not an assertion of visual/audio playback quality.
    shellResults.push(await page.evaluate((id) => window.videoFlow.openResult(id, 'folder'), mp4.id))
    shellResults.push(await page.evaluate((id) => window.videoFlow.openResult(id, 'file'), mp4.id))
    expect(shellResults.every((result) => result.ok)).toBe(true)
    await app.evaluate(({ BrowserWindow }) => { const win = BrowserWindow.getAllWindows()[0]; win.setSize(1440, 900); win.focus() })
    await page.locator('.workspace').evaluate((el) => { el.scrollTop = 0 })
    await mkdir('screenshots', { recursive: true })
    await page.screenshot({ path: 'screenshots/installed-main.png' })
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(920, 640))
    await page.locator('.task-section').scrollIntoViewIfNeeded()
    await page.screenshot({ path: 'screenshots/installed-920.png' })
    await chooseNative(long)
    await page.getByLabel('输出格式', { exact: true }).selectOption('WEBM')
    await page.getByRole('button', { name: '开始转换', exact: true }).click()
    await expect.poll(async () => (await page.evaluate(() => window.videoFlow.getStatus())).data.media.tasks[0]?.progress).not.toBeNull()
    await page.getByRole('button', { name: '取消转换', exact: true }).click()
    await expect(page.getByText('已取消', { exact: true })).toBeVisible()
    expect((await readdir(directory)).some((name) => name.startsWith('.videoflow-'))).toBe(false)
    await page.getByRole('button', { name: '开始转换', exact: true }).click()
    await expect(page.getByText('转换中', { exact: true })).toBeVisible()
    // Select the exit-confirmation outcome; media process termination and filesystem cleanup are real.
    const exiting = app.waitForEvent('close')
    await app.evaluate(({ dialog, BrowserWindow }) => { dialog.showMessageBox = async () => ({ response: 1 }); BrowserWindow.getAllWindows()[0].close() })
    await exiting
    app = null
    expect((await readdir(directory)).some((name) => name.startsWith('.videoflow-'))).toBe(false)
    const children = await execute('powershell.exe', ['-NoProfile', '-Command', "Get-CimInstance Win32_Process | Where-Object { $_.Name -in 'ffmpeg.exe','ffprobe.exe' } | Select-Object -ExpandProperty ExecutablePath"], { windowsHide: true })
    expect(children.stdout.includes(path.join(install, 'resources'))).toBe(false)
    app = await launch()
    page = await app.firstWindow()
    await expect(page.getByText('桌面连接正常', { exact: true })).toBeVisible()
    await chooseNative(input)
    expect((await page.evaluate(() => window.videoFlow.getStatus())).data.media.tasks).toEqual([])
    expect(errors).toEqual([])
    const evidence = { version: status.data.version, installedApp: exe, isolatedPath: env.PATH, workingDirectory: install, engines: status.data.engines, outputDirectory: directory, outputs, nativeFilePicker: true, shellResults, pageErrors: errors, relaunch: true, noEngineProcessesAfterExit: true }
    await mkdir('.cache', { recursive: true })
    await writeFile('.cache/installed-acceptance.json', JSON.stringify(evidence, null, 2))
    console.log('安装验收输出:', directory)
  } finally {
    if (app) { await app.evaluate(({ dialog }) => { dialog.showMessageBox = async () => ({ response: 1 }) }).catch(() => {}); await app.close() }
  }
})
