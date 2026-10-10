export function sizeText(bytes) {
  if (!Number.isFinite(bytes)) return '未知'
  for (const [unit, factor] of [['GB', 1024 ** 3], ['MB', 1024 ** 2], ['KB', 1024]]) {
    if (bytes >= factor) return `${(bytes / factor).toFixed(2)} ${unit}`
  }
  return `${bytes} B`
}
export function durationText(seconds) {
  if (!(seconds > 0)) return '未知'
  const value = Math.floor(seconds)
  return [Math.floor(value / 3600), Math.floor(value / 60) % 60, value % 60].map((part) => String(part).padStart(2, '0')).join(':')
}

export function containerText(video) {
  if (!video?.container) return '未知'
  const names = video.container.toLowerCase().split(',')
  const extension = video.extension?.toLowerCase()
  if (names.includes('matroska') || names.includes('webm')) return extension === 'webm' || video.container === 'webm' ? 'WEBM' : 'MKV'
  if (names.includes('mov') || names.includes('mp4')) return extension === 'mov' ? 'MOV' : 'MP4'
  if (names.includes('avi')) return 'AVI'
  return video.container.toUpperCase()
}
