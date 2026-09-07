import { SAFE_UPLOAD_BYTES, VIDEO_EXTS } from '../constants.js'
import { humanSize, toFloat, toInt } from '../utils.js'

export function qualityLabel(height) {
  if (!height) return 'Обычное'
  if (height >= 2160) return '2160p 4K'
  if (height >= 1440) return '1440p 2K'
  if (height >= 1080) return '1080p FHD'
  if (height >= 720) return '720p HD'
  return `${height}p`
}

export function formatButtonText(choice) {
  const parts = []
  if (choice.width && choice.height) {
    parts.push(`${choice.height}p ${choice.width}x${choice.height}`)
  } else {
    parts.push(choice.label)
  }
  if (choice.fps && choice.fps >= 50) parts.push(`${choice.fps}fps`)
  parts.push(choice.codec || choice.ext || 'mp4')
  if (choice.sizeBytes) {
    parts.push(`${choice.sizeIsEstimate ? '~' : ''}${humanSize(choice.sizeBytes)}`)
  } else {
    parts.push('размер ?')
  }
  if (choice.sizeBytes && choice.sizeBytes > SAFE_UPLOAD_BYTES) parts.push('>50 МБ')
  return parts.join(' · ').slice(0, 64)
}

export function collectChoices(info) {
  const formats = (info.formats || []).filter((fmt) => fmt && typeof fmt === 'object')
  const duration = toFloat(info.duration)
  const videos = formats.filter(isVideo)
  const audios = formats.filter(isAudio)
  const bestAudio = pickBestAudio(audios)

  const grouped = new Map()
  for (const video of videos) {
    const choice = asChoice(video, bestAudio, duration)
    if (!choice) continue
    const fpsBucket = (choice.fps || 0) >= 50 ? 60 : 30
    const key = choice.height
      ? `${choice.width || 0}:${choice.height}:${fpsBucket}:${choice.codec || choice.ext}`
      : `0:0:${fpsBucket}:${choice.codec || choice.ext}:${choice.selector}`
    const current = grouped.get(key)
    if (!current || isBetter(choice, current)) grouped.set(key, choice)
  }

  let choices = [...grouped.values()]
  if (!choices.length && info.url) {
    const [size, estimate] = bytesOf(info, duration)
    choices = [
      {
        selector: 'best',
        height: toInt(info.height),
        width: toInt(info.width),
        fps: toInt(info.fps),
        ext: String(info.ext || 'mp4'),
        codec: codecLabel(info.vcodec, String(info.ext || 'mp4')),
        sizeBytes: size,
        sizeIsEstimate: estimate,
        label: qualityLabel(toInt(info.height)),
      },
    ]
  }

  choices.sort((a, b) => {
    if ((b.height || 0) !== (a.height || 0)) return (b.height || 0) - (a.height || 0)
    if ((b.width || 0) !== (a.width || 0)) return (b.width || 0) - (a.width || 0)
    if ((b.fps || 0) !== (a.fps || 0)) return (b.fps || 0) - (a.fps || 0)
    return (b.sizeBytes || 0) - (a.sizeBytes || 0)
  })
  return choices.slice(0, 10)
}

function isVideo(fmt) {
  const ext = String(fmt.ext || '').toLowerCase()
  if (['mhtml', 'jpg', 'png', 'webp', 'svg', 'mp3', 'm4a', 'ogg', 'wav'].includes(ext)) return false
  if (fmt.protocol === 'mhtml') return false
  if (String(fmt.format_note || '').toLowerCase().includes('storyboard')) return false
  if (fmt.vcodec && fmt.vcodec !== 'none') return true
  return VIDEO_EXTS.has(ext) && (fmt.acodec || 'none') === 'none'
}

function isAudio(fmt) {
  return (fmt.acodec || 'none') !== 'none' && (fmt.vcodec || 'none') === 'none'
}

function pickBestAudio(audios) {
  if (!audios.length) return null
  return audios.reduce((best, fmt) => (audioScore(fmt) > audioScore(best) ? fmt : best))
}

function audioScore(fmt) {
  const ext = String(fmt.ext || '').toLowerCase()
  const acodec = String(fmt.acodec || '').toLowerCase()
  const abr = toFloat(fmt.abr || fmt.tbr) || 0
  const size = toInt(fmt.filesize || fmt.filesize_approx) || 0
  const preferredExt = ext === 'm4a' || ext === 'mp4' ? 2 : ext === 'webm' ? 1 : 0
  const preferredCodec = acodec.includes('mp4a') || acodec.startsWith('aac') ? 2 : 1
  return preferredExt * 1e12 + preferredCodec * 1e9 + abr * 1e6 + size
}

function asChoice(video, audio, duration) {
  const formatId = String(video.format_id || '').trim()
  if (!formatId) return null

  const hasAudio = (video.acodec || 'none') !== 'none'
  let selector
  let size
  let estimate
  let ext

  if (hasAudio) {
    selector = formatId
    ;[size, estimate] = bytesOf(video, duration)
    ext = String(video.ext || 'mp4')
  } else if (audio) {
    selector = `${formatId}+${audio.format_id}`
    const [vSize, vEst] = bytesOf(video, duration)
    const [aSize, aEst] = bytesOf(audio, duration)
    if (vSize != null && aSize != null) {
      size = vSize + aSize
      estimate = vEst || aEst
    } else {
      ;[size, estimate] = bytesOf(
        { tbr: (toFloat(video.tbr) || 0) + (toFloat(audio.tbr || audio.abr) || 0) },
        duration,
      )
    }
    ext = ['mp4', 'm4v'].includes(String(video.ext || '')) ? 'mp4' : String(video.ext || 'mp4')
  } else {
    selector = formatId
    ;[size, estimate] = bytesOf(video, duration)
    ext = String(video.ext || 'mp4')
  }

  const height = toInt(video.height)
  return {
    selector,
    height,
    width: toInt(video.width),
    fps: toInt(video.fps),
    ext,
    codec: codecLabel(video.vcodec, ext),
    sizeBytes: size,
    sizeIsEstimate: estimate,
    label: choiceLabel(video, height),
  }
}

function codecLabel(vcodec, ext) {
  const raw = String(vcodec || '').toLowerCase()
  if (raw.startsWith('avc') || raw.includes('h264')) return 'H.264'
  if (raw.startsWith('hev') || raw.startsWith('hvc') || raw.includes('hevc')) return 'HEVC'
  if (raw.startsWith('av01') || raw.startsWith('av1')) return 'AV1'
  if (raw.startsWith('vp9') || raw.startsWith('vp09')) return 'VP9'
  if (raw.startsWith('vp8')) return 'VP8'
  return (ext || 'mp4').toUpperCase()
}

function choiceLabel(video, height) {
  if (height) return qualityLabel(height)
  const hint = `${video.format_note || ''} ${video.format_id || ''}`.toLowerCase()
  if (hint.includes('high')) return 'Высокое'
  if (hint.includes('med') || hint.includes('medium')) return 'Среднее'
  if (hint.includes('low')) return 'Низкое'
  return qualityLabel(height)
}

function bytesOf(fmt, duration) {
  for (const key of ['filesize', 'filesize_approx']) {
    const value = toInt(fmt[key])
    if (value && value > 0) return [value, key === 'filesize_approx']
  }
  const tbr = toFloat(fmt.tbr || fmt.vbr || fmt.abr)
  if (tbr && duration) return [Math.max(1, Math.trunc((tbr * 1000) / 8 * duration)), true]
  return [null, true]
}

function isBetter(next, current) {
  const nextScore = choiceScore(next)
  const currentScore = choiceScore(current)
  for (let i = 0; i < nextScore.length; i += 1) {
    if (nextScore[i] !== currentScore[i]) return nextScore[i] > currentScore[i]
  }
  return false
}

function choiceScore(choice) {
  return [
    ['mp4', 'm4v'].includes(choice.ext) ? 1 : 0,
    choice.sizeBytes && !choice.sizeIsEstimate ? 1 : 0,
    choice.sizeBytes || 0,
  ]
}
