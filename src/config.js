import fs from 'node:fs'
import path from 'node:path'
import dotenv from 'dotenv'
import { DOWNLOADS_DIR, ROOT_DIR } from './constants.js'

function parseIds(raw) {
  const values = new Set()
  for (const part of String(raw || '')
    .replaceAll(';', ',')
    .split(',')) {
    const trimmed = part.trim()
    if (!trimmed) continue
    const id = Number.parseInt(trimmed, 10)
    if (Number.isFinite(id)) values.add(id)
  }
  return values
}

export function loadConfig() {
  dotenv.config({ path: path.join(ROOT_DIR, '.env') })

  const botToken = (process.env.BOT_TOKEN || '').trim()
  if (!botToken || botToken.startsWith('123456')) {
    throw new Error('Set BOT_TOKEN in .env (copy .env.example and paste the token from @BotFather).')
  }

  const cookiesRaw = (process.env.COOKIES_FILE || '').trim()
  const cookiesFile = cookiesRaw || null
  if (cookiesFile && !fs.existsSync(cookiesFile)) {
    throw new Error(`COOKIES_FILE not found: ${cookiesFile}`)
  }

  const cookiesFromBrowser = (process.env.COOKIES_FROM_BROWSER || '').trim().toLowerCase() || null
  const maxHeight = Math.max(144, Number.parseInt(process.env.MAX_HEIGHT || '720', 10) || 720)

  fs.mkdirSync(DOWNLOADS_DIR, { recursive: true })

  return {
    botToken,
    allowedUserIds: parseIds(process.env.ALLOWED_USER_IDS),
    cookiesFile,
    cookiesFromBrowser,
    maxHeight,
    downloadsDir: DOWNLOADS_DIR,
  }
}
