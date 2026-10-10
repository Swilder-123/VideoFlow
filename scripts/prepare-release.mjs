import { readFile, writeFile, mkdir, readdir, copyFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { detectEngines } = require('../electron/media/engines.cjs')
const { run } = require('../electron/media/process.cjs')
const root = process.cwd()
// The original vendor notice must accompany the binaries, not an invented license summary.
await readFile('third-party/FFmpeg-vendor-README.txt')
const engines = await detectEngines({ root, env: {} })
const manifest = { provider: 'Gyan Doshi', url: 'https://www.gyan.dev/ffmpeg/builds/', license: 'GPL-3.0-or-later', engines: {} }
await mkdir('third-party/npm', { recursive: true })
for (const name of ['ffmpeg', 'ffprobe']) {
  const engine = engines[name]
  if (!engine.available) throw new Error(engine.error)
  const bytes = await readFile(engine.path)
  manifest.engines[name] = { filename: `${name}.exe`, version: engine.version, sha256: createHash('sha256').update(bytes).digest('hex') }
}
await writeFile('third-party/engine-manifest.json', JSON.stringify(manifest, null, 2) + '\n')
const { stdout } = await run(engines.ffmpeg.path, ['-buildconf'])
await writeFile('third-party/FFmpeg-buildconf.txt', stdout)
await copyFile('tools/ffmpeg/LICENSE', 'third-party/FFmpeg-GPL-3.0.txt')
// Include the notices of all production packages that may be copied or bundled.
const seen = new Set()
async function notices(name) {
  if (seen.has(name)) return
  seen.add(name)
  const directory = path.join(root, 'node_modules', name)
  const pkg = JSON.parse(await readFile(path.join(directory, 'package.json'), 'utf8'))
  const names = (await readdir(directory)).filter((file) => /^(licen[cs]e|copying|notice)(\.|$)/i.test(file))
  if (!names.length) throw new Error(`Missing license: ${name}`)
  for (const file of names) await copyFile(path.join(directory, file), path.join('third-party/npm', `${name.replaceAll('/', '__')}--${file}`))
  for (const dependency of Object.keys(pkg.dependencies || {})) await notices(dependency)
}
const pkg = JSON.parse(await readFile('package.json', 'utf8'))
for (const name of Object.keys(pkg.dependencies || {})) await notices(name)
await copyFile('node_modules/electron/LICENSE', 'third-party/Electron-LICENSE.txt')
console.log(`发布资源检查通过：${pkg.version}，两个本地引擎，${seen.size} 个生产依赖许可证。`)
