import fs from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { InputFile } from 'grammy'
import { SAFE_UPLOAD_BYTES } from '../../constants.js'
import { ProgressState } from '../../download/index.js'
import { UserFacingError } from '../../errors.js'
import { childLogger } from '../../logger.js'
import { safeFilename } from '../../utils.js'
import { dropJob, getJob } from '../jobs.js'

const log = childLogger({ module: 'quality' })
const EMPTY_KEYBOARD = { inline_keyboard: [] }

export function registerQualityHandler(bot, { downloader, busy, config }) {
  bot.callbackQuery(/^q:/, async (ctx) => {
    const parts = (ctx.callbackQuery.data || '').split(':')
    if (parts.length !== 3) {
      await ctx.answerCallbackQuery()
      return
    }

    const [, jobId, action] = parts
    const job = getJob(jobId)
    if (!job) {
      await ctx.answerCallbackQuery({ text: 'Сессия устарела. Пришли ссылку ещё раз.', show_alert: true })
      return
    }
    if (job.userId !== ctx.from.id) {
      await ctx.answerCallbackQuery({ text: 'Это не твой выбор.', show_alert: true })
      return
    }

    if (action === 'c') {
      dropJob(jobId)
      await ctx.answerCallbackQuery({ text: 'Отменил' })
      await editOfferMessage(ctx, 'Выбор качества отменён.', { removeKeyboard: true })
      return
    }

    const index = Number.parseInt(action, 10)
    const choice = job.offer.choices[index]
    if (!choice) {
      await ctx.answerCallbackQuery({ text: 'Такого варианта уже нет.', show_alert: true })
      return
    }

    if (busy.has(job.userId)) {
      await ctx.answerCallbackQuery({ text: 'Подожди, предыдущее видео ещё качается.', show_alert: true })
      return
    }

    dropJob(jobId)
    log.info(
      { userId: job.userId, jobId, platform: job.offer.platform, selector: choice.selector, label: choice.label },
      'quality chosen',
    )
    await ctx.answerCallbackQuery({ text: choice.label })
    await downloadChoice(ctx, { downloader, busy, config, job, choice })
  })
}

async function downloadChoice(ctx, { downloader, busy, config, job, choice }) {
  const userId = job.userId
  const progress = new ProgressState(`Скачиваю ${choice.label}…`)
  const workdir = path.join(config.downloadsDir, `${userId}_${randomUUID().replaceAll('-', '')}`)
  busy.add(userId)

  const initialStatus =
    choice.sizeBytes && choice.sizeBytes > SAFE_UPLOAD_BYTES
      ? `${job.offer.platform}: файл больше 50 МБ — скачаю ${choice.label} и сожму.`
      : `${job.offer.platform}: ${progress.text}`

  await editOfferMessage(ctx, initialStatus, { removeKeyboard: true })

  let stopped = false
  const typing = keepTyping(ctx, job.chatId, () => stopped)
  const statusUpdates = refreshStatus(ctx, job.offer.platform, progress, () => stopped)

  try {
    const video = await downloader.download({
      url: job.offer.url,
      platform: job.offer.platform,
      workdir,
      progress,
      formatSelector: choice.selector,
      alreadyResolved: true,
      title: job.offer.title,
      duration: job.offer.duration,
      width: choice.width,
      height: choice.height,
    })

    stopped = true
    statusUpdates.cancel()
    await editOfferMessage(ctx, `${job.offer.platform}: отправляю…`)
    await sendVideo(ctx, video)
    log.info({ userId, platform: job.offer.platform, title: video.title }, 'video sent')
    await ctx.deleteMessage().catch(() => {})
  } catch (error) {
    stopped = true
    const message =
      error instanceof UserFacingError
        ? error.userMessage
        : 'Что-то сломалось при скачивании. Попробуй ещё раз.'
    if (error instanceof UserFacingError) {
      log.warn({ userId, platform: job.offer.platform, err: error }, 'download rejected')
    } else {
      log.error({ userId, platform: job.offer.platform, err: error }, 'download failed')
    }
    await editOfferMessage(ctx, message, { removeKeyboard: true })
  } finally {
    stopped = true
    typing.cancel()
    statusUpdates.cancel()
    busy.delete(userId)
    await fs.rm(workdir, { recursive: true, force: true })
  }
}

function isPhotoOffer(ctx) {
  return Boolean(ctx.callbackQuery?.message?.photo?.length)
}

async function editOfferMessage(ctx, text, { removeKeyboard = false } = {}) {
  const extra = removeKeyboard ? { reply_markup: EMPTY_KEYBOARD } : {}

  try {
    if (isPhotoOffer(ctx)) {
      await ctx.editMessageCaption({ caption: text, ...extra })
      return
    }
    await ctx.editMessageText(text, extra)
  } catch (error) {
    if (!removeKeyboard) return
    try {
      await ctx.editMessageReplyMarkup({ reply_markup: EMPTY_KEYBOARD })
    } catch {
      // ignore
    }
    try {
      if (isPhotoOffer(ctx)) {
        await ctx.editMessageCaption({ caption: text })
      } else {
        await ctx.editMessageText(text)
      }
    } catch {
      log.debug({ err: error }, 'offer message update failed')
    }
  }
}

function keepTyping(ctx, chatId, isStopped) {
  const timer = setInterval(() => {
    if (isStopped()) return
    ctx.api.sendChatAction(chatId, 'upload_video').catch(() => {})
  }, 4000)
  ctx.api.sendChatAction(chatId, 'upload_video').catch(() => {})
  return { cancel: () => clearInterval(timer) }
}

function refreshStatus(ctx, platform, progress, isStopped) {
  let last = ''
  const timer = setInterval(async () => {
    if (isStopped() || progress.text === last) return
    last = progress.text
    await editOfferMessage(ctx, `${platform}: ${progress.text}`)
  }, 2000)
  return { cancel: () => clearInterval(timer) }
}

async function sendVideo(ctx, video) {
  const caption = video.title.slice(0, 1024)
  const filename = safeFilename(video.title, video.path)
  const options = {
    caption,
    duration: video.duration ?? undefined,
    width: video.width ?? undefined,
    height: video.height ?? undefined,
    supports_streaming: true,
    thumbnail: video.thumbnail ? new InputFile(video.thumbnail) : undefined,
  }
  try {
    await ctx.replyWithVideo(new InputFile(video.path, filename), options)
  } catch (error) {
    log.warn({ err: error }, 'replyWithVideo failed, sending as document')
    await ctx.replyWithDocument(new InputFile(video.path, filename), { caption })
  }
}
