import fs from 'node:fs/promises'
import path from 'node:path'
import { SAFE_UPLOAD_BYTES, VIDEO_EXTENSIONS } from '../constants.js'
import { UserFacingError, humanizeYtdlpError } from '../errors.js'
import { toInt, unwrapInfo } from '../utils.js'
import { collectChoices } from './formats.js'
import { getFfmpegPath, probeDuration, runFfmpeg } from './ffmpeg.js'
import { resolveVkUrl } from './vk.js'
import { downloadVideo, extractInfo } from './ytdlp.js'

export class ProgressState {
  constructor(text = 'Подключаюсь к сайту…') {
    this.text = text
  }
}

export class Downloader {
  constructor(config) {
    this.config = config
    this.ffmpegPath = getFfmpegPath()
  }

  async resolveUrl(url, platform, progress) {
    if (platform !== 'VK') return url
    if (progress) progress.text = 'Ищу видео на VK…'
    return resolveVkUrl(url)
  }

  async listFormats(url, platform) {
    const resolved = await this.resolveUrl(url, platform)
    let info
    try {
      info = unwrapInfo(await extractInfo(resolved, this.config, this.ffmpegPath))
    } catch (error) {
      throw this.toUserError(error, platform, 'Не удалось прочитать видео. Проверь ссылку и попробуй ещё раз.')
    }
    if (!info) throw new UserFacingError('По ссылке не нашлось видео.')

    const choices = collectChoices(info)
    if (!choices.length) throw new UserFacingError('Не нашёл варианты качества для этого видео.')

    return {
      url: resolved,
      platform,
      title: String(info.title || `Видео ${platform}`).trim(),
      duration: toInt(info.duration),
      choices,
    }
  }

  async download({
    url,
    platform,
    workdir,
    progress,
    formatSelector,
    alreadyResolved = false,
    title,
    duration,
    width,
    height,
  }) {
    await fs.mkdir(workdir, { recursive: true })
    const resolved = alreadyResolved ? url : await this.resolveUrl(url, platform, progress)
    const selector =
      formatSelector ||
      `bv*[height<=${this.config.maxHeight}]+ba/b[height<=${this.config.maxHeight}]/bv*+ba/b`

    try {
      await downloadVideo(resolved, this.config, this.ffmpegPath, {
        output: path.join(workdir, '%(id)s.%(ext)s'),
        format: selector,
        onProgress: (percent) => {
          progress.text = `Скачиваю… ${Math.round(percent)}%`
        },
      })
    } catch (error) {
      throw this.toUserError(error, platform, 'Не удалось скачать видео. Проверь ссылку и попробуй ещё раз.')
    }

    let videoPath = await pickDownloadedFile(workdir)
    if (!videoPath) throw new UserFacingError('Видео скачалось, но файл не найден. Попробуй другую ссылку.')

    progress.text = 'Готовлю файл для Telegram…'
    videoPath = await toMp4(videoPath)

    const probedDuration = await probeDuration(videoPath)
    const finalDuration = probedDuration != null ? Math.round(probedDuration) : duration ?? null

    const stat = await fs.stat(videoPath)
    if (stat.size > SAFE_UPLOAD_BYTES) {
      progress.text = 'Сжимаю под лимит Telegram…'
      videoPath = await compress(videoPath, finalDuration, SAFE_UPLOAD_BYTES)
    }

    const thumbnail = await makeThumbnail(videoPath)
    return {
      path: videoPath,
      title: String(title || `Видео ${platform}`).trim(),
      platform,
      duration: finalDuration,
      width: width ?? null,
      height: height ?? null,
      thumbnail,
    }
  }

  toUserError(error, platform, fallback) {
    if (error instanceof UserFacingError) return error
    const raw = error.raw || error.stderr || error.message || String(error)
    if (raw) return new UserFacingError(humanizeYtdlpError(raw, platform))
    console.error(error)
    return new UserFacingError(fallback)
  }
}

async function pickDownloadedFile(folder) {
  const names = await fs.readdir(folder)
  const files = []
  for (const name of names) {
    const full = path.join(folder, name)
    const stat = await fs.stat(full)
    if (stat.isFile() && VIDEO_EXTENSIONS.has(path.extname(name).toLowerCase())) {
      files.push({ full, size: stat.size })
    }
  }
  files.sort((a, b) => b.size - a.size)
  return files[0]?.full || null
}

async function toMp4(src) {
  if (path.extname(src).toLowerCase() === '.mp4') return src
  const dst = src.replace(path.extname(src), '.mp4')
  await runFfmpeg([
    '-y',
    '-i',
    src,
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '23',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    '-movflags',
    '+faststart',
    dst,
  ])
  await fs.unlink(src).catch(() => {})
  return dst
}

async function compress(src, duration, maxBytes) {
  const seconds = Math.max(duration || 1, 1)
  const targetBits = maxBytes * 8 * 0.8
  const audioBps = 96_000
  const videoBps = Math.max(250_000, Math.trunc(targetBits / seconds) - audioBps)
  const parsed = path.parse(src)
  const dst = path.join(parsed.dir, `${parsed.name}_tg.mp4`)
  await runFfmpeg([
    '-y',
    '-i',
    src,
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-b:v',
    String(videoBps),
    '-maxrate',
    String(videoBps),
    '-bufsize',
    String(videoBps * 2),
    '-pix_fmt',
    'yuv420p',
    '-vf',
    "scale='min(1280,iw)':-2",
    '-c:a',
    'aac',
    '-b:a',
    '96k',
    '-ac',
    '2',
    '-movflags',
    '+faststart',
    dst,
  ])
  const stat = await fs.stat(dst)
  if (stat.size > maxBytes) {
    await fs.unlink(dst).catch(() => {})
    throw new UserFacingError(
      'Видео слишком большое для Telegram-бота (лимит 50 МБ). Пришли более короткое видео или более лёгкую ссылку.',
    )
  }
  if (src !== dst) await fs.unlink(src).catch(() => {})
  return dst
}

async function makeThumbnail(videoPath) {
  const parsed = path.parse(videoPath)
  const thumb = path.join(parsed.dir, `${parsed.name}_thumb.jpg`)
  try {
    await runFfmpeg([
      '-y',
      '-ss',
      '1',
      '-i',
      videoPath,
      '-frames:v',
      '1',
      '-vf',
      'scale=320:-2',
      '-q:v',
      '5',
      thumb,
    ])
    const stat = await fs.stat(thumb)
    if (stat.size > 0) return thumb
  } catch {
    return null
  }
  return null
}
