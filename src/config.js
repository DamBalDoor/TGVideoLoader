import fs from 'node:fs'
import path from 'node:path'
import dotenv from 'dotenv'
import { DATA_DIR, DOWNLOADS_DIR, ROOT_DIR } from './constants.js'

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
  fs.mkdirSync(DATA_DIR, { recursive: true })

  const adminRaw = (process.env.ADMIN_USER_ID || '').trim()
  const adminUserId = adminRaw ? Number.parseInt(adminRaw, 10) : null

  const reportTimezone = (process.env.REPORT_TIMEZONE || 'Asia/Bangkok').trim()
  const reportHour = Math.min(23, Math.max(0, Number.parseInt(process.env.REPORT_HOUR || '5', 10) || 5))
  const reportMinute = Math.min(59, Math.max(0, Number.parseInt(process.env.REPORT_MINUTE || '0', 10) || 0))
  const analyticsDbPath = path.resolve(
    ROOT_DIR,
    (process.env.ANALYTICS_DB_PATH || path.join('data', 'analytics.db')).trim(),
  )

  return {
    botToken,
    allowedUserIds: parseIds(process.env.ALLOWED_USER_IDS),
    adminUserId: Number.isFinite(adminUserId) ? adminUserId : null,
    cookiesFile,
    cookiesFromBrowser,
    maxHeight,
    downloadsDir: DOWNLOADS_DIR,
    analyticsDbPath,
    reportTimezone,
    reportHour,
    reportMinute,
  }
}
