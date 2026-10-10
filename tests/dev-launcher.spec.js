import { test, expect } from '@playwright/test'
import { spawn, execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)

test('实际开发启动脚本显示 Windows 原生窗口，关闭窗口后退出', async () => {
  test.skip(process.platform !== 'win32' || !!process.env.VIDEOFLOW_TEST_EXE, '仅验证 Windows 开发启动脚本')
  const launcher = spawn(process.execPath, ['scripts/dev.mjs'], {
    cwd: process.cwd(), env: process.env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
  })
  let output = ''
  launcher.stdout.on('data', (chunk) => { output += chunk })
  launcher.stderr.on('data', (chunk) => { output += chunk })
  const exited = new Promise((resolve, reject) => {
    launcher.once('exit', resolve)
    launcher.once('error', reject)
  })
  let electronPid
  async function powershell(command) {
    const utf8Command = '[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); ' + command
    const { stdout } = await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', utf8Command], { windowsHide: true })
    return stdout.trim()
  }
  try {
    await expect.poll(() => output, { timeout: 15_000 }).toContain('Vite 开发服务已就绪')
    await expect.poll(async () => {
      const result = await powershell(`Get-CimInstance Win32_Process -Filter "ParentProcessId = ${launcher.pid} AND Name = 'electron.exe'" | Select-Object -ExpandProperty ProcessId`)
      electronPid = result ? Number(result) : undefined
      return electronPid
    }).toBeTruthy()
    await expect.poll(async () => Number(await powershell(`(Get-Process -Id ${electronPid}).MainWindowHandle.ToInt64()`)), { timeout: 15_000 }).toBeGreaterThan(0)
    expect(await powershell(`(Get-Process -Id ${electronPid}).MainWindowTitle`)).toBe('VideoFlow 视频格式转换器')
    expect(await powershell(`(Get-Process -Id ${electronPid}).CloseMainWindow()`)).toBe('True')
    await expect.poll(() => launcher.exitCode, { timeout: 10_000 }).toBe(0)
    expect(await exited).toBe(0)
  } finally {
    if (launcher.exitCode === null) {
      // Only stop the Electron child owned by this test's launcher.
      await powershell(`Get-CimInstance Win32_Process -Filter "ParentProcessId = ${launcher.pid} AND Name = 'electron.exe'" | ForEach-Object { Stop-Process -Id $_.ProcessId -ErrorAction SilentlyContinue }`)
      launcher.kill()
    }
  }
})
