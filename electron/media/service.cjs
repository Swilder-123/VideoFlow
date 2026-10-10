const { EventEmitter } = require('node:events')
const fs = require('node:fs/promises')
const { constants } = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const { randomUUID } = require('node:crypto')
const { run, userError, readableError } = require('./process.cjs')
const { formats, conversionArgs, progressReader } = require('./formats.cjs')

const extensions = ['mp4', 'avi', 'mov', 'mkv', 'webm']
const number = (value) => Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : null
function frameRate(value) {
  const [a, b = '1'] = String(value || '').split('/')
  return number(Number(a) / Number(b))
}

class MediaService extends EventEmitter {
  constructor(engines) {
    super()
    this.engines = engines
    this.video = null
    this.tasks = []
    this.importPhase = ''
    this.active = null
    this.revision = 0
    this.disposed = false
  }
  snapshot() { return { revision: this.revision, video: this.video, tasks: this.tasks.map((task) => ({ ...task })), importPhase: this.importPhase } }
  publish() { this.revision++; this.emit('change', this.snapshot()) }
  requireEngine(name) {
    if (!this.engines[name].available) throw userError(this.engines[name].error)
    return this.engines[name].path
  }
  assertIdle() {
    if (this.disposed) throw userError('应用正在关闭。')
    if (this.active) throw userError('已有转换任务正在执行，请等待完成或取消。')
    if (this.importPhase) throw userError('正在读取视频，请稍候。')
  }
  async probe(filePath, signal) {
    const { stdout } = await run(this.requireEngine('ffprobe'), ['-v', 'error', '-protocol_whitelist', 'file,pipe', '-show_format', '-show_streams', '-of', 'json', filePath], { signal, timeout: 30_000 })
    const data = JSON.parse(stdout)
    const stream = data.streams?.find((item) => item.codec_type === 'video' && !item.disposition?.attached_pic)
    if (!stream) throw userError('该文件没有可用的视频流，请选择包含视频画面的文件。')
    return {
      duration: number(data.format?.duration) || number(stream.duration),
      width: number(stream.width), height: number(stream.height), codec: stream.codec_name || null,
      fps: frameRate(stream.avg_frame_rate) || frameRate(stream.r_frame_rate),
      container: data.format?.format_name || null, streamIndex: stream.index,
    }
  }
  async importFile(filePath) {
    this.assertIdle()
    if (typeof filePath !== 'string' || !path.isAbsolute(filePath)) throw userError('请选择本地视频文件。')
    const extension = path.extname(filePath).slice(1).toLowerCase()
    if (!extensions.includes(extension)) throw userError('暂不支持此文件类型，请选择 MP4、AVI、MOV、MKV 或 WEBM 文件。')
    this.importPhase = 'parsing'
    this.importController = new AbortController()
    this.publish()
    this.importPromise = this.loadVideo(filePath, extension, this.importController.signal)
    try { return await this.importPromise }
    finally { this.importPhase = ''; this.importPromise = null; this.publish() }
  }
  async loadVideo(filePath, extension, signal) {
    try {
      let stat
      try { stat = await fs.stat(filePath) } catch { throw userError('无法读取文件，文件可能已移动或没有访问权限。') }
      if (!stat.isFile()) throw userError('请选择一个视频文件，而不是文件夹。')
      if (!stat.size) throw userError('该文件为空，请重新选择视频文件。')
      const metadata = await this.probe(filePath, signal)
      if (signal.aborted) throw userError('操作已取消。')
      const video = { id: randomUUID(), name: path.basename(filePath), path: filePath, extension, size: stat.size, modified: stat.mtimeMs, ...metadata, thumbnail: null, thumbnailState: 'loading', thumbnailError: '' }
      this.video = video
      this.importPhase = 'thumbnail'
      this.publish()
      let cache
      try {
        const engine = this.requireEngine('ffmpeg')
        cache = await fs.mkdtemp(path.join(os.tmpdir(), 'videoflow-thumbnail-'))
        const image = path.join(cache, 'preview.jpg')
        // Stay before the end, including sub-second videos. Retry first frame if seek yields no frame.
        const seek = video.duration >= 1 ? Math.min(3, video.duration * 0.1) : 0
        for (const position of [...new Set([seek, 0])]) {
          try {
            await run(engine, ['-hide_banner', '-loglevel', 'error', '-nostdin', '-y', '-ss', String(position), '-protocol_whitelist', 'file,pipe', '-i', filePath, '-map', `0:${video.streamIndex}`, '-frames:v', '1', '-vf', 'scale=640:360:force_original_aspect_ratio=decrease:out_range=full,format=yuvj420p', '-color_range', 'pc', '-q:v', '4', image], { signal, timeout: 20_000 })
            const buffer = await fs.readFile(image)
            if (buffer.length > 1_000_000 || !buffer.length) throw new Error('Invalid thumbnail')
            video.thumbnail = `data:image/jpeg;base64,${buffer.toString('base64')}`
            break
          } catch (error) { if (signal.aborted || position === 0) throw error }
        }
        video.thumbnailState = 'ready'
      } catch (error) {
        video.thumbnailState = 'failed'
        video.thumbnailError = readableError(error, '缩略图生成失败，仍可转换视频。')
      } finally {
        if (cache) await this.cleanDirectory(cache, os.tmpdir(), 'videoflow-thumbnail-')
      }
      return video
    } catch (error) { throw userError(readableError(error, '视频解析失败，文件可能损坏或不是有效视频。')) }
  }
  async cleanDirectory(directory, parent, prefix) {
    // Only delete a unique directory created by this service, never source/user directories.
    if (path.dirname(path.resolve(directory)) !== path.resolve(parent) || !path.basename(directory).startsWith(prefix)) throw new Error('Unsafe cleanup path')
    await fs.rm(directory, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 })
  }
  removeVideo() { this.assertIdle(); this.video = null; this.publish() }
  start({ videoId, format }, directory) {
    this.assertIdle()
    this.requireEngine('ffmpeg')
    if (!Object.hasOwn(formats, format)) throw userError('请选择受支持的输出格式。')
    if (!this.video || videoId !== this.video.id) throw userError('当前视频已改变，请重新选择后再转换。')
    if (typeof directory !== 'string' || !path.isAbsolute(directory)) throw userError('请选择有效的输出目录。')
    const video = { ...this.video }
    const task = { id: randomUUID(), name: video.name, format, status: 'waiting', progress: null, startedAt: new Date().toISOString(), outputPath: null, outputSize: null, error: '' }
    this.tasks.unshift(task)
    const active = { task, controller: new AbortController(), done: null }
    this.active = active
    this.publish()
    // The lock is set synchronously before any filesystem work or IPC reply.
    active.done = new Promise((resolve) => setImmediate(resolve)).then(() => this.convert(active, video, directory))
    return { ...task }
  }
  async convert(active, video, directory) {
    const { task, controller } = active
    let temporary, publishedPath
    try {
      const input = await fs.stat(video.path)
      if (input.size !== video.size || input.mtimeMs !== video.modified) throw userError('源文件已改变，请重新导入后再转换。')
      let outputStat
      try { outputStat = await fs.stat(directory) } catch { throw userError('输出目录不存在或不可访问，请重新选择。') }
      if (!outputStat.isDirectory()) throw userError('输出路径不是文件夹。')
      await fs.access(directory, constants.W_OK)
      if (controller.signal.aborted) throw userError('操作已取消。')
      temporary = await fs.mkdtemp(path.join(directory, '.videoflow-'))
      const tempFile = path.join(temporary, `output.${task.format.toLowerCase()}`)
      task.status = 'running'
      this.publish()
      await run(this.requireEngine('ffmpeg'), conversionArgs(video.path, tempFile, task.format, video.streamIndex), {
        signal: controller.signal,
        onStdout: progressReader(video.duration, (value) => { task.progress = value; this.publish() }),
      })
      if (controller.signal.aborted) throw userError('操作已取消。')
      // Verify muxed output before exposing a completed result.
      await this.probe(tempFile, controller.signal)
      const stat = await fs.stat(tempFile)
      if (!stat.size) throw userError('转换未生成有效的输出文件。')
      const stem = path.parse(video.name).name.slice(0, 120)
      for (let index = 0; index < 10_000; index++) {
        if (controller.signal.aborted) throw userError('操作已取消。')
        const candidate = path.join(directory, `${stem}_converted${index ? ` (${index})` : ''}.${task.format.toLowerCase()}`)
        try {
          // Same-volume hardlink publishes atomically and refuses overwrite. FAT/exFAT fallback is exclusive copy.
          try { await fs.link(tempFile, candidate) }
          catch (error) {
            if (error.code === 'EEXIST') throw error
            if (!['EXDEV', 'EPERM', 'ENOTSUP', 'ENOSYS'].includes(error.code)) throw error
            await fs.copyFile(tempFile, candidate, constants.COPYFILE_EXCL)
          }
          publishedPath = candidate
          break
        } catch (error) { if (error.code !== 'EEXIST') throw error }
      }
      if (!publishedPath) throw userError('同名输出文件过多，请选择其他目录。')
      if (controller.signal.aborted) throw userError('操作已取消。')
      await this.cleanDirectory(temporary, directory, '.videoflow-')
      temporary = null
      if (controller.signal.aborted) throw userError('操作已取消。')
      task.status = 'completed'; task.progress = 100; task.outputPath = publishedPath; task.outputSize = stat.size
    } catch (error) {
      task.status = controller.signal.aborted ? 'cancelled' : 'failed'
      task.error = controller.signal.aborted ? '' : readableError(error)
      if (publishedPath) {
        try { await fs.unlink(publishedPath) } catch (cleanupError) { task.error += ` 结果清理失败：${publishedPath}（${cleanupError.code}）` }
      }
    } finally {
      if (temporary) {
        try { await this.cleanDirectory(temporary, directory, '.videoflow-') }
        catch { task.error += ` 临时文件清理失败，请手动删除：${temporary}` }
      }
      this.active = null
      this.publish()
    }
  }
  async cancel(id) {
    if (!this.active || this.active.task.id !== id) throw userError('该任务已结束或不存在。')
    const active = this.active
    active.controller.abort()
    await active.done
  }
  clearTasks() { this.assertIdle(); this.tasks = []; this.publish() }
  resultPath(id) {
    const task = this.tasks.find((item) => item.id === id && item.status === 'completed')
    if (!task?.outputPath) throw userError('该任务没有可打开的结果文件。')
    return task.outputPath
  }
  async dispose() {
    this.disposed = true
    this.importController?.abort()
    this.active?.controller.abort()
    await Promise.allSettled([this.importPromise, this.active?.done].filter(Boolean))
    this.video = null
  }
}
module.exports = { MediaService, extensions }
