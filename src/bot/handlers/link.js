import { UserFacingError } from '../../errors.js'
import { childLogger } from '../../logger.js'
import { findVideoUrl } from '../../urls.js'
import { sendOfferMessage } from '../offer-message.js'
import { createJob } from '../jobs.js'

const log = childLogger({ module: 'link' })

export function registerLinkHandler(bot, { downloader, busy, config, settings }) {
  bot.on(['message:text', 'message:caption'], async (ctx) => {
    const text = ctx.message.text || ''
    if (text.startsWith('/')) return

    const found = findVideoUrl(ctx.message)
    if (!found) {
      await ctx.reply(
        'Не вижу поддерживаемую ссылку. Пришли URL с YouTube, VK, Rutube, Instagram, TikTok, X, OK.ru или Pinterest.',
      )
      return
    }

    const userId = ctx.from.id
    if (busy.has(userId)) {
      await ctx.reply('Подожди, сейчас занят предыдущим запросом.')
      return
    }

    busy.add(userId)
    log.info({ userId, platform: found.platform, url: found.url }, 'listing formats')
    const status = await ctx.reply(`${found.platform}: смотрю доступные качества…`)
    try {
      const { advancedMode } = settings.get(userId)
      const offer = await downloader.listFormats(found.url, found.platform, { advanced: advancedMode })
      const job = createJob({
        userId,
        chatId: ctx.chat.id,
        offer,
      })
      log.info(
        {
          userId,
          jobId: job.jobId,
          platform: offer.platform,
          choices: offer.choices.length,
          hasThumbnail: Boolean(offer.thumbnailUrl),
        },
        'formats ready',
      )
      await ctx.api.deleteMessage(ctx.chat.id, status.message_id).catch(() => {})
      await sendOfferMessage(ctx, {
        offer,
        job,
        downloadsDir: config.downloadsDir,
        log,
      })
    } catch (error) {
      const message =
        error instanceof UserFacingError
          ? error.userMessage
          : 'Не получилось прочитать варианты качества. Попробуй ещё раз.'
      if (error instanceof UserFacingError) {
        log.warn({ userId, platform: found.platform, err: error }, 'list formats rejected')
      } else {
        log.error({ userId, platform: found.platform, err: error }, 'list formats failed')
      }
      await ctx.api.editMessageText(ctx.chat.id, status.message_id, message)
    } finally {
      busy.delete(userId)
    }
  })
}
