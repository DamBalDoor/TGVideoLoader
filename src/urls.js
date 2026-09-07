import { PLATFORMS } from './constants.js'

const URL_RE = /https?:\/\/[^\s<>"'`]+/gi

function hostname(url) {
  try {
    let host = new URL(url).hostname.toLowerCase()
    if (host.startsWith('www.')) host = host.slice(4)
    return host
  } catch {
    return ''
  }
}

export function detectPlatform(url) {
  const host = hostname(url)
  if (!host) return null

  for (const [name, domains] of Object.entries(PLATFORMS)) {
    if (domains.some((domain) => host === domain || host.endsWith(`.${domain}`))) {
      return name
    }
  }
  return null
}

export function extractSupportedUrl(text) {
  const matches = String(text || '').match(URL_RE) || []
  for (const match of matches) {
    const raw = match.replace(/[).,\]}>"']+$/g, '')
    const platform = detectPlatform(raw)
    if (platform) return { url: raw, platform }
  }
  return null
}

export function findVideoUrl(message) {
  const found = extractSupportedUrl(message.text || message.caption || '')
  if (found) return found

  const entities = [...(message.entities || []), ...(message.caption_entities || [])]
  for (const entity of entities) {
    if (!entity.url) continue
    const platform = detectPlatform(entity.url)
    if (platform) return { url: entity.url, platform }
  }
  return null
}
