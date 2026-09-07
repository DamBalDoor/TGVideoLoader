export function toInt(value) {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : null
}

export function toFloat(value) {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function humanSize(size) {
  if (size < 1024) return `${size} Б`
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} КБ`
  const mb = size / (1024 * 1024)
  if (mb < 10) return `${mb.toFixed(1)} МБ`
  return `${Math.round(mb)} МБ`
}

export function formatDuration(seconds) {
  if (!seconds || seconds < 0) return null
  const total = Math.trunc(seconds)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60
  if (hours) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`
}

export function safeFilename(title, filePath) {
  const ext = filePath.includes('.') ? filePath.slice(filePath.lastIndexOf('.')) : '.mp4'
  const cleaned = String(title || '')
    .replace(/[^\p{L}\p{N} ._ -]/gu, '_')
    .trim()
    .slice(0, 80)
  return `${cleaned || 'video'}${ext}`
}

export function unwrapInfo(info) {
  if (info && info._type === 'playlist') {
    const entries = (info.entries || []).filter(Boolean)
    return entries[0] || null
  }
  return info || null
}
