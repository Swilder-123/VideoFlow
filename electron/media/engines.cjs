const path = require('node:path')
const fs = require('node:fs/promises')
const { run } = require('./process.cjs')

async function resolveEngine(name, { root, resourcesPath, isPackaged = false, env = process.env } = {}) {
  const filename = name + (process.platform === 'win32' ? '.exe' : '')
  const override = env[`VIDEOFLOW_${name.toUpperCase()}_PATH`]
  const bundled = resourcesPath && path.join(resourcesPath, 'ffmpeg', filename)
  const candidates = isPackaged ? [bundled].filter(Boolean) : override ? [override] : [
    resourcesPath && path.join(resourcesPath, 'ffmpeg', filename),
    path.join(root, 'tools', 'ffmpeg', 'bin', filename),
    ...(env.PATH || env.Path || '').split(path.delimiter).filter(Boolean).map((dir) => path.join(dir.replace(/^"|"$/g, ''), filename)),
  ].filter(Boolean)
  for (const candidate of candidates) {
    if (!path.isAbsolute(candidate)) continue
    try {
      if (!(await fs.stat(candidate)).isFile()) continue
      const { stdout } = await run(candidate, ['-version'], { timeout: 8000 })
      if (!stdout.startsWith(`${name} version `)) continue
      return { available: true, path: candidate, version: stdout.split(/\r?\n/)[0] }
    } catch { /* Continue discovery; explicit overrides deliberately do not fall back. */ }
  }
  return { available: false, path: isPackaged ? bundled : override || null, error: isPackaged
    ? `随附的 ${name} 不存在或无法运行，请重新安装 VideoFlow。`
    : `未找到可用的 ${name}。请将 ${filename} 放入 tools/ffmpeg/bin，或设置 VIDEOFLOW_${name.toUpperCase()}_PATH 为可执行文件绝对路径，再重启应用。` }
}

async function detectEngines(options) {
  const [ffmpeg, ffprobe] = await Promise.all(['ffmpeg', 'ffprobe'].map((name) => resolveEngine(name, options)))
  return { ffmpeg, ffprobe }
}
module.exports = { detectEngines, resolveEngine }
