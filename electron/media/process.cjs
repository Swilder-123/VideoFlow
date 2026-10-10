const { spawn } = require('node:child_process')

function userError(message) { return Object.assign(new Error(message), { userMessage: message }) }

// No shell, no renderer-provided executable or flags. Always wait for close before cleanup.
function run(executable, args, { signal, timeout = 0, onStdout, maxOutput = 4 * 1024 * 1024 } = {}) {
  return new Promise((resolve, reject) => {
    let stdout = '', stderr = '', failure
    const child = spawn(executable, args, { shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
    const abort = () => { failure = userError('操作已取消。'); child.kill('SIGKILL') }
    const timer = timeout ? setTimeout(() => { failure = userError('视频处理超时，请检查文件后重试。'); child.kill('SIGKILL') }, timeout) : null
    child.on('error', (error) => { failure = error })
    child.stdout.on('data', (buffer) => {
      const text = buffer.toString()
      if (onStdout) onStdout(text)
      else {
        stdout += text
        if (stdout.length > maxOutput) { failure = userError('视频信息过大，无法处理此文件。'); child.kill('SIGKILL') }
      }
    })
    child.stderr.on('data', (buffer) => { stderr = (stderr + buffer.toString()).slice(-24_000) })
    signal?.addEventListener('abort', abort, { once: true })
    if (signal?.aborted) abort()
    child.once('close', (code) => {
      clearTimeout(timer)
      signal?.removeEventListener('abort', abort)
      if (failure) reject(failure)
      else if (code !== 0) reject(Object.assign(new Error(stderr || `进程退出码 ${code}`), { stderr, exitCode: code }))
      else resolve({ stdout, stderr })
    })
  })
}

function readableError(error, fallback = '视频处理失败，文件可能已损坏或编码不受支持。') {
  if (error.userMessage) return error.userMessage
  const text = `${error.code || ''} ${error.stderr || error.message}`
  if (/ENOSPC|No space left/i.test(text)) return '磁盘空间不足，请清理空间或选择其他输出目录。'
  if (/EACCES|EPERM|Permission denied|Access is denied/i.test(text)) return '无法访问文件或输出目录，请检查权限或选择其他目录。'
  if (/ENOENT|No such file/i.test(text)) return '文件或视频处理程序不存在，请重新选择文件并检查引擎路径。'
  if (/Unknown encoder|Encoder .* not found/i.test(text)) return '当前 FFmpeg 缺少此格式所需的编码器，请安装完整构建。'
  return fallback
}

module.exports = { run, userError, readableError }
