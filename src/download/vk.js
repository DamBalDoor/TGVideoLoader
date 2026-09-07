import { UserFacingError } from '../errors.js'

const VIDEO_ID_RE = /(?:video|clip)(-?\d+_\d+)/i
const IFRAME_SRC_RE = /<iframe[^>]+?\bsrc\s*=\s*["'](\/\/[^"']+|https?:\/\/[^"']+)["']/gi
const OWN_HOSTS = ['vk.com', 'vk.ru', 'vkontakte.ru', 'vkvideo.ru', 'userapi.com']

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'

export function extractVkId(url) {
  const match = String(url || '').match(VIDEO_ID_RE)
  return match ? match[1] : null
}

export async function resolveVkUrl(url) {
  const videoId = extractVkId(url)
  if (!videoId) return url

  try {
    const payload = await downloadAlVideo(videoId)
    const html = typeof payload[1] === 'string' ? payload[1] : ''
    const opts = payload[payload.length - 1]
    const player = opts && typeof opts === 'object' ? opts.player : null
    if (player && typeof player === 'object' && player.params) return url

    const embed = firstExternalIframe(html)
    if (embed) {
      console.info(`VK ${videoId} is an external embed: ${embed}`)
      return embed
    }
  } catch (error) {
    if (error instanceof UserFacingError) throw error
    console.warn(`VK resolve failed for ${videoId}:`, error.message)
  }
  return url
}

async function downloadAlVideo(videoId) {
  const body = new URLSearchParams({ act: 'show', video: videoId, al: '1' })
  const response = await fetch('https://vk.com/al_video.php', {
    method: 'POST',
    headers: {
      'User-Agent': USER_AGENT,
      Referer: 'https://vk.com/al_video.php',
      'X-Requested-With': 'XMLHttpRequest',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })
  if (!response.ok) {
    throw new Error(`al_video HTTP ${response.status}`)
  }

  let raw = await response.text()
  raw = raw.trim()
  if (raw.startsWith('<!--')) raw = raw.slice(4)

  const data = JSON.parse(raw)
  const top = data.payload
  if (!Array.isArray(top) || top.length < 2) {
    throw new Error('unexpected al_video payload')
  }

  const code = String(top[0])
  const payload = top[1]
  if (code === '3') {
    throw new UserFacingError('VK: видео недоступно без входа. Добавь cookies в .env.')
  }
  if (!Array.isArray(payload)) {
    throw new Error('al_video payload is not a list')
  }
  return payload
}

function firstExternalIframe(html) {
  IFRAME_SRC_RE.lastIndex = 0
  let match
  while ((match = IFRAME_SRC_RE.exec(html))) {
    const url = normalizeEmbedUrl(match[1])
    if (url) return url
  }
  return null
}

function normalizeEmbedUrl(raw) {
  let src = String(raw || '').replaceAll('\\/', '/').trim()
  if (src.startsWith('//')) src = `https:${src}`
  try {
    let host = new URL(src).hostname.toLowerCase()
    if (host.startsWith('www.')) host = host.slice(4)
    if (!host || OWN_HOSTS.some((own) => host === own || host.endsWith(`.${own}`))) return null
    return src
  } catch {
    return null
  }
}
