import { createServer } from 'vite'
import { spawn } from 'node:child_process'
import electron from 'electron'

let server
let child
let stopping = false
async function stop(code = 0) {
  if (stopping) return
  stopping = true
  if (child && child.exitCode === null) child.kill()
  await server?.close()
  process.exit(code)
}
try {
  server = await createServer()
  await server.listen()
  const env = { ...process.env, VIDEOFLOW_DEV_URL: 'http://127.0.0.1:5173' }
  delete env.ELECTRON_RUN_AS_NODE
  // Electron is the interactive app, not a hidden background helper.
  // On Windows, windowsHide can also hide its first native window.
  child = spawn(electron, ['.'], { stdio: 'inherit', env, windowsHide: false })
  child.on('exit', (code) => stop(code ?? 0))
  child.on('error', (error) => { console.error(error); stop(1) })
  process.on('SIGINT', () => stop())
  process.on('SIGTERM', () => stop())
  console.log('Vite 开发服务已就绪，正在启动 VideoFlow 桌面窗口；关闭窗口即可停止。')
} catch (error) { console.error(error); await stop(1) }
