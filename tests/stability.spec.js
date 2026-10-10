import { test, expect } from '@playwright/test'
import { mkdtemp, copyFile, unlink, rm, readdir } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import os from 'node:os'
import { createRequire } from 'node:module'
import { fixtures, MediaService, run } from './helpers/media-fixtures'
import { containerText } from '../src/format'
const require = createRequire(import.meta.url)
const { readableError } = require('../electron/media/process.cjs')

test('容器显示名称、磁盘不足错误映射（仅错误分支，不填满磁盘）', () => {
  for (const [container, extension, label] of [
    ['matroska,webm', 'mkv', 'MKV'], ['matroska,webm', 'webm', 'WEBM'],
    ['mov,mp4,m4a,3gp,3g2,mj2', 'mp4', 'MP4'], ['mov,mp4,m4a,3gp,3g2,mj2', 'mov', 'MOV'], ['avi', 'avi', 'AVI'],
  ]) expect(containerText({ container, extension })).toBe(label)
  expect(readableError({ code: 'ENOSPC' })).toContain('磁盘空间不足')
  expect(readableError({ stderr: 'No space left on device' })).toContain('磁盘空间不足')
})

test('真实 Windows ACL 不可写目录与导入后源文件删除', async () => {
  test.skip(process.platform !== 'win32', 'Windows ACL 专项验证')
  const setup = await fixtures()
  const directory = await mkdtemp(path.join(os.tmpdir(), 'videoflow-acl-'))
  const media = new MediaService(setup.engines)
  const sid = execFileSync('whoami.exe', ['/user', '/fo', 'csv', '/nh'], { encoding: 'utf8', windowsHide: true }).match(/S-1-5-[\d-]+/)[0]
  const icacls = path.join(process.env.SystemRoot, 'System32', 'icacls.exe')
  let denied = false
  try {
    const video = await media.importFile(setup.input)
    await run(icacls, [directory, '/deny', `*${sid}:(OI)(CI)(W)`])
    denied = true
    media.start({ videoId: video.id, format: 'MKV' }, directory)
    await media.active.done
    expect(media.tasks[0].status).toBe('failed')
    expect(media.tasks[0].error).toContain('权限')
    await run(icacls, [directory, '/remove:d', `*${sid}`])
    denied = false
    expect(await readdir(directory)).toEqual([])
    const missing = path.join(setup.directory, '转换前已删除.mp4')
    await copyFile(setup.input, missing)
    const selected = await media.importFile(missing)
    await unlink(missing)
    media.start({ videoId: selected.id, format: 'MP4' }, setup.directory)
    await media.active.done
    expect(media.tasks[0].status).toBe('failed')
    expect(media.tasks[0].error).toContain('不存在')
    expect((await readdir(setup.directory)).some((name) => name.startsWith('.videoflow-'))).toBe(false)
  } finally {
    if (denied) await run(icacls, [directory, '/remove:d', `*${sid}`])
    await media.dispose()
    if (path.dirname(directory) === path.resolve(os.tmpdir()) && path.basename(directory).startsWith('videoflow-acl-')) await rm(directory, { recursive: true, force: true })
  }
})
