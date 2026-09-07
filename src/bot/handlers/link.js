import { UserFacingError } from '../../errors.js'
import { findVideoUrl } from '../../urls.js'
import { createJob } from '../jobs.js'
import { offerKeyboard, offerText } from '../keyboards.js'

export function registerLinkHandler(bot, { downloader, busy }) {
  bot.on(['message:text', 'message:caption'], async (ctx) => {
    const text = ctx.message.text || ''
    if (text.startsWith('/')) return

    const found = findVideoUrl(ctx.message)
    if (!found) {
      await ctx.reply(
        'Не вижу поддерживаемую ссылку. Пришли URL с YouTube, VK, Rutube, Instagram или TikTok.',
      )
      return
    }

    const userId = ctx.from.id
    if (busy.has(userId)) {
      await ctx.reply('Подожди, сейчас занят предыдущим запросом.')
      return
    }

    busy.add(userId)
    const status = await ctx.reply(`${found.platform}: смотрю доступные качества…`)
    try {
      const offer = await downloader.listFormats(found.url, found.platform)
      const job = createJob({
        userId,
        chatId: ctx.chat.id,
        offer,
      })
      await ctx.api.editMessageText(ctx.chat.id, status.message_id, offerText(offer), {
        reply_markup: offerKeyboard(job),
      })
    } catch (error) {
      const message =
        error instanceof UserFacingError
          ? error.userMessage
          : 'Не получилось прочитать варианты качества. Попробуй ещё раз.'
      if (!(error instanceof UserFacingError)) console.error(error)
      await ctx.api.editMessageText(ctx.chat.id, status.message_id, message)
    } finally {
      busy.delete(userId)
    }
  })
}
