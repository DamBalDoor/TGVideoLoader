import fs from 'node:fs'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import youtubeDlModule from 'youtube-dl-exec'
import { DATA_DIR } from '../constants.js'
import { YTDLP_PATH } from './ytdlp.js'

const execFileAsync = promisify(execFile)
const updateYtdlp = youtubeDlModule?.update ?? youtubeDlModule?.default?.update
const STATE_FILE = path.join(DATA_DIR, 'ytdlp-last-update.json')

export async function maybeUpdateYtdlp(config, log) {
  if (!config.ytdlpAutoUpdate) {
    log.debug('yt-dlp auto-update disabled')
    return
  }

  const state = readState()
  const now = Date.now()
  if (state?.at && now - state.at < config.ytdlpUpdateIntervalMs) {
    log.debug(
      { version: state.version, nextInHours: Math.ceil((config.ytdlpUpdateIntervalMs - (now - state.at)) / 3_600_000) },
      'yt-dlp update skipped — checked recently',
    )
    return
  }

  const versionBefore = await getYtdlpVersion().catch(() => null)
  log.info({ version: versionBefore }, 'checking yt-dlp updates')

  try {
    const output = await withTimeout(updateYtdlp(), config.ytdlpUpdateTimeoutMs)
    const versionAfter = await getYtdlpVersion().catch(() => versionBefore)
    const message = normalizeOutput(output)
    writeState({ at: now, version: versionAfter, message, versionBefore })

    if (versionBefore && versionAfter && versionBefore !== versionAfter) {
      log.info({ versionBefore, versionAfter, message }, 'yt-dlp updated')
      return
    }

    log.info({ version: versionAfter, message }, 'yt-dlp is up to date')
  } catch (error) {
    writeState({ at: now, version: versionBefore, error: String(error.message || error).slice(0, 200) })
    log.warn({ err: error, version: versionBefore }, 'yt-dlp update failed')
  }
}

export async function getYtdlpVersion() {
  const { stdout } = await execFileAsync(YTDLP_PATH, ['--version'], { windowsHide: true })
  return String(stdout || '').trim()
}

function readState() {
  try {
    if (!fs.existsSync(STATE_FILE)) return null
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))
  } catch {
    return null
  }
}

function writeState(state) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(STATE_FILE, JSON.stringify({ ...state, savedAt: new Date().toISOString() }, null, 2))
}

function normalizeOutput(output) {
  const text = String(output?.stdout ?? output ?? '').trim()
  return text.split('\n').find((line) => line.trim())?.trim().slice(0, 240) || 'ok'
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`yt-dlp update timed out after ${ms}ms`)), ms)
    }),
  ])
}
