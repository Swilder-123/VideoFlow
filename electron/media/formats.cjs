const formats = Object.freeze({
  MP4: { muxer: 'mp4', video: 'libx264', audio: 'aac', args: ['-preset', 'medium', '-crf', '23', '-movflags', '+faststart'] },
  MOV: { muxer: 'mov', video: 'libx264', audio: 'aac', args: ['-preset', 'medium', '-crf', '23', '-movflags', '+faststart'] },
  MKV: { muxer: 'matroska', video: 'libx264', audio: 'aac', args: ['-preset', 'medium', '-crf', '23'] },
  AVI: { muxer: 'avi', video: 'mpeg4', audio: 'libmp3lame', args: ['-q:v', '4'] },
  WEBM: { muxer: 'webm', video: 'libvpx-vp9', audio: 'libopus', args: ['-crf', '32', '-b:v', '0', '-deadline', 'good', '-cpu-used', '4'] },
})
function conversionArgs(input, output, format, streamIndex) {
  const profile = formats[format]
  if (!profile) throw new Error('Unsupported format')
  return ['-hide_banner', '-loglevel', 'error', '-nostdin', '-n', '-progress', 'pipe:1', '-stats_period', '0.25',
    '-protocol_whitelist', 'file,pipe', '-i', input, '-map', `0:${streamIndex}`, '-map', '0:a:0?',
    '-sn', '-dn', '-map_metadata', '-1', '-c:v', profile.video, ...profile.args,
    '-vf', 'pad=ceil(iw/2)*2:ceil(ih/2)*2', '-pix_fmt', 'yuv420p', '-threads', '2',
    '-c:a', profile.audio, '-b:a', '192k', '-ac', '2', '-ar', '48000', '-f', profile.muxer, output]
}
// out_time_us (and FFmpeg's legacy out_time_ms) are microseconds, never milliseconds.
function progressReader(duration, report) {
  let pending = '', seconds = null, last = 0
  return (chunk) => {
    pending += chunk
    const lines = pending.split(/\r?\n/)
    pending = lines.pop()
    for (const line of lines) {
      const split = line.indexOf('=')
      const key = line.slice(0, split), value = line.slice(split + 1)
      if (key === 'out_time_us' && /^\d+$/.test(value)) seconds = Number(value) / 1_000_000
      if (key === 'progress') {
        const percent = duration > 0 && seconds !== null ? Math.max(last, Math.min(99, seconds / duration * 100)) : null
        if (percent !== null) last = percent
        report(percent)
      }
    }
  }
}
module.exports = { formats, conversionArgs, progressReader }
