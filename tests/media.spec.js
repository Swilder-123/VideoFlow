import { test, expect } from '@playwright/test'
import { readFile, readdir, stat, writeFile, mkdir, link } from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fixtures, longSample, invalidSamples, MediaService, run, detectEngines } from './helpers/media-fixtures'
const require = createRequire(import.meta.url)
const { progressReader } = require('../electron/media/formats.cjs')
let setup, media
test.beforeAll(async () => { setup = await fixtures() })
test.beforeEach(() => { media = new MediaService(setup.engines) })
test.afterEach(async () => { await media.dispose() })

test('真实解析、缩略图、五种输出、反向 MP4、解码及不覆盖原文件', async () => {
  test.setTimeout(120_000)
  const video = await media.importFile(setup.input)
  expect(video).toMatchObject({ width: 320, height: 180, codec: 'h264', fps: 24, thumbnailState: 'ready' })
  expect(video.duration).toBeCloseTo(2, 0)
  expect(video.thumbnail).toMatch(/^data:image\/jpeg;base64,/)
  const original = await readFile(setup.input)
  const encoders = { MP4: 'h264', AVI: 'mpeg4', MOV: 'h264', MKV: 'h264', WEBM: 'vp9' }
  const audio = { MP4: 'aac', AVI: 'mp3', MOV: 'aac', MKV: 'aac', WEBM: 'opus' }
  const outputs = []
  const progress = []
  media.on('change', (snapshot) => {
    if (snapshot.tasks[0]?.status === 'running' && snapshot.tasks[0].progress !== null) progress.push(snapshot.tasks[0].progress)
  })
  for (const format of Object.keys(encoders)) {
    const task = media.start({ videoId: video.id, format }, setup.directory)
    expect(task.status).toBe('waiting')
    expect(() => media.start({ videoId: video.id, format }, setup.directory)).toThrow('已有转换任务')
    await media.active.done
    const result = media.tasks[0]
    expect(result.error).toBe('')
    expect(result.status).toBe('completed')
    expect(result.progress).toBe(100)
    expect((await stat(result.outputPath)).size).toBeGreaterThan(0)
    const metadata = await media.probe(result.outputPath)
    expect(metadata.codec).toBe(encoders[format])
    const { stdout } = await run(setup.engines.ffprobe.path, ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=codec_name', '-of', 'json', result.outputPath])
    expect(JSON.parse(stdout).streams[0].codec_name).toBe(audio[format])
    await run(setup.engines.ffmpeg.path, ['-v', 'error', '-xerror', '-i', result.outputPath, '-f', 'null', '-'], { timeout: 20_000 })
    outputs.push(result.outputPath)
  }
  expect(progress.length).toBeGreaterThan(0)
  expect(progress.every((value) => value >= 0 && value <= 99)).toBe(true)
  expect(await readFile(setup.input)).toEqual(original)
  media.start({ videoId: video.id, format: 'MP4' }, setup.directory)
  await media.active.done
  expect(media.tasks[0].outputPath).toContain('_converted (1).mp4')
  for (const file of outputs.filter((file) => !file.endsWith('.mp4'))) {
    const imported = await media.importFile(file)
    media.start({ videoId: imported.id, format: 'MP4' }, setup.directory)
    await media.active.done
    expect(media.tasks[0].status).toBe('completed')
    await run(setup.engines.ffmpeg.path, ['-v', 'error', '-xerror', '-i', media.tasks[0].outputPath, '-f', 'null', '-'], { timeout: 20_000 })
  }
  expect((await readdir(setup.directory)).some((name) => name.startsWith('.videoflow-'))).toBe(false)
  media.clearTasks()
  expect(media.tasks).toEqual([])
  expect((await stat(outputs[0])).size).toBeGreaterThan(0)
  console.log('真实转换样本与输出目录:', setup.directory)
})

test('短视频、损坏及无视频流、切换文件与缩略图失败降级', async () => {
  const tiny = path.join(setup.directory, '极短 1帧.mp4')
  await run(setup.engines.ffmpeg.path, ['-v', 'error', '-n', '-f', 'lavfi', '-i', 'color=c=blue:s=64x64:r=25', '-frames:v', '1', '-c:v', 'libx264', tiny])
  expect((await media.importFile(tiny)).thumbnailState).toBe('ready')
  const previousId = media.video.id
  const { broken, empty } = await invalidSamples(setup.directory)
  await expect(media.importFile(broken)).rejects.toThrow('视频解析失败')
  await expect(media.importFile(empty)).rejects.toThrow('文件为空')
  await expect(media.importFile(path.join(setup.directory, 'bad.txt'))).rejects.toThrow('不支持')
  const audioOnly = path.join(setup.directory, '只有音频.mp4')
  await run(setup.engines.ffmpeg.path, ['-v', 'error', '-n', '-f', 'lavfi', '-i', 'sine=duration=0.1', '-c:a', 'aac', audioOnly])
  await expect(media.importFile(audioOnly)).rejects.toThrow('没有可用的视频流')
  expect(media.video.id).toBe(previousId)
  const unavailable = new MediaService({ ...setup.engines, ffmpeg: { available: false, error: '未找到 FFmpeg' } })
  try {
    const selected = await unavailable.importFile(setup.input)
    expect(selected.codec).toBe('h264')
    expect(selected.thumbnailState).toBe('failed')
    expect(selected.thumbnail).toBeNull()
  } finally { await unavailable.dispose() }
})

test('真实运行中取消、清理临时输出、源文件修改与失败状态', async () => {
  const input = await longSample(setup.engines, setup.directory)
  const selected = await media.importFile(input)
  const task = media.start({ videoId: selected.id, format: 'WEBM' }, setup.directory)
  await expect.poll(() => media.tasks[0].progress, { timeout: 20_000 }).not.toBeNull()
  expect(media.tasks[0].status).toBe('running')
  await media.cancel(task.id)
  expect(media.tasks[0].status).toBe('cancelled')
  expect(media.tasks[0].outputPath).toBeNull()
  expect((await readdir(setup.directory)).some((name) => name.startsWith('.videoflow-'))).toBe(false)
  expect((await stat(input)).size).toBeGreaterThan(0)
  media.start({ videoId: selected.id, format: 'MP4' }, path.join(setup.directory, '不存在目录'))
  await media.active.done
  expect(media.tasks[0].status).toBe('failed')
  await writeFile(input, 'Changed after import')
  media.start({ videoId: selected.id, format: 'MP4' }, setup.directory)
  await media.active.done
  expect(media.tasks[0].error).toContain('源文件已改变')
})

test('缺失引擎说明、未知时长及分块进度解析', async () => {
  const engines = await detectEngines({ root: process.cwd(), env: { VIDEOFLOW_FFMPEG_PATH: path.join(setup.directory, 'missing.exe'), VIDEOFLOW_FFPROBE_PATH: path.join(setup.directory, 'missing.exe') } })
  expect(engines.ffmpeg.available).toBe(false)
  expect(engines.ffprobe.error).toContain('VIDEOFLOW_FFPROBE_PATH')
  const resourceRoot = path.join(setup.directory, 'resources')
  await mkdir(path.join(resourceRoot, 'ffmpeg'), { recursive: true })
  await link(setup.engines.ffmpeg.path, path.join(resourceRoot, 'ffmpeg', 'ffmpeg.exe'))
  await link(setup.engines.ffprobe.path, path.join(resourceRoot, 'ffmpeg', 'ffprobe.exe'))
  const packagedPaths = await detectEngines({ root: setup.directory, resourcesPath: resourceRoot, isPackaged: true, env: { VIDEOFLOW_FFMPEG_PATH: 'invalid.exe' } })
  expect(packagedPaths.ffmpeg.available).toBe(true)
  expect(packagedPaths.ffprobe.path).toBe(path.join(resourceRoot, 'ffmpeg', 'ffprobe.exe'))
  const missingBundled = await detectEngines({ root: process.cwd(), resourcesPath: setup.directory, isPackaged: true, env: { VIDEOFLOW_FFMPEG_PATH: setup.engines.ffmpeg.path } })
  expect(missingBundled.ffmpeg.available).toBe(false)
  expect(missingBundled.ffmpeg.error).toContain('重新安装')
  const values = [], read = progressReader(null, (value) => values.push(value))
  read('out_time_us=1000000\nprogress=continue\n')
  expect(values).toEqual([null])
  const known = [], parse = progressReader(2, (value) => known.push(value))
  parse('out_time_'); parse('us=1000000\nprogress=continue\nout_time_us=3000000\nprogress=end\n')
  expect(known).toEqual([50, 99])
})

test('真实无时长 WebM 使用不确定进度，完成后才为 100%', async () => {
  const live = path.join(setup.directory, '无时长 live.webm')
  await run(setup.engines.ffmpeg.path, ['-v', 'error', '-nostdin', '-n', '-f', 'lavfi', '-i', 'testsrc2=size=160x90:rate=10', '-t', '1', '-c:v', 'libvpx-vp9', '-threads', '2', '-live', '1', live])
  const selected = await media.importFile(live)
  expect(selected.duration).toBeNull()
  const progress = []
  media.on('change', (snapshot) => { if (snapshot.tasks[0]?.status === 'running') progress.push(snapshot.tasks[0].progress) })
  media.start({ videoId: selected.id, format: 'MP4' }, setup.directory)
  await media.active.done
  expect(progress.length).toBeGreaterThan(0)
  expect(progress.every((value) => value === null)).toBe(true)
  expect(media.tasks[0].status).toBe('completed')
  expect(media.tasks[0].progress).toBe(100)
})
