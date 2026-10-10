import { createRequire } from 'node:module'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import path from 'node:path'
const require = createRequire(import.meta.url)
export const { run } = require('../../electron/media/process.cjs')
export const { detectEngines } = require('../../electron/media/engines.cjs')
export const { MediaService } = require('../../electron/media/service.cjs')

export async function fixtures() {
  const engines = await detectEngines({ root: process.cwd() })
  if (!engines.ffmpeg.available || !engines.ffprobe.available) throw new Error('真实媒体测试需要 FFmpeg 和 FFprobe，请参考 tools/ffmpeg/README.md 安装。')
  await mkdir('.cache', { recursive: true })
  const directory = await mkdtemp(path.resolve('.cache', 'phase2-test-'))
  const input = path.join(directory, '中文 空格 样本.mp4')
  await run(engines.ffmpeg.path, ['-v', 'error', '-nostdin', '-n', '-f', 'lavfi', '-i', 'testsrc2=size=320x180:rate=24', '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000', '-t', '2', '-c:v', 'libx264', '-preset', 'ultrafast', '-threads', '2', '-pix_fmt', 'yuv420p', '-c:a', 'aac', input], { timeout: 30_000 })
  return { engines, directory, input }
}

export async function longSample(engines, directory) {
  const file = path.join(directory, '取消测试 720p.mp4')
  await run(engines.ffmpeg.path, ['-v', 'error', '-nostdin', '-n', '-f', 'lavfi', '-i', 'testsrc2=size=1280x720:rate=30', '-t', '20', '-c:v', 'libx264', '-preset', 'ultrafast', '-threads', '2', file], { timeout: 60_000 })
  return file
}

export async function invalidSamples(directory) {
  const broken = path.join(directory, '损坏.mp4'), empty = path.join(directory, '空.mp4')
  await writeFile(broken, 'This is intentionally invalid video data for a rejection test.')
  await writeFile(empty, '')
  return { broken, empty }
}
