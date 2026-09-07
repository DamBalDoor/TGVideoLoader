import fs from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { toInt } from '../utils.js'

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'

export function pickThumbnailUrl(info) {
  const list = Array.isArray(info?.thumbnails) ? info.thumbnails : []
  const withUrl = list.filter((item) => item?.url)
  if (withUrl.length) {
    withUrl.sort((a, b) => (toInt(b.width) || 0) - (toInt(a.width) || 0))
    return withUrl[0].url
  }
  const direct = info?.thumbnail
  return typeof direct === 'string' && direct.trim() ? direct.trim() : null
}

export async function downloadThumbnail(url, downloadsDir) {
  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Referer: url },
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) {
    throw new Error(`thumbnail HTTP ${response.status}`)
  }

  const type = (response.headers.get('content-type') || '').toLowerCase()
  let ext = '.jpg'
  if (type.includes('png')) ext = '.png'
  else if (type.includes('webp')) ext = '.webp'

  const dest = path.join(downloadsDir, `thumb_${randomUUID().replaceAll('-', '')}${ext}`)
  const body = Buffer.from(await response.arrayBuffer())
  if (body.length < 100) {
    throw new Error('thumbnail too small')
  }
  await fs.writeFile(dest, body)
  return dest
}
