import fs from 'node:fs/promises'
import { InputFile } from 'grammy'
import { downloadThumbnail } from '../download/thumbnail.js'
import { offerKeyboard, offerText } from './keyboards.js'

export async function sendOfferMessage(ctx, { offer, job, downloadsDir, log }) {
  const caption = offerText(offer)
  const replyMarkup = offerKeyboard(job)

  if (!offer.thumbnailUrl) {
    await ctx.reply(caption, { reply_markup: replyMarkup })
    return
  }

  try {
    await ctx.replyWithPhoto(offer.thumbnailUrl, { caption, reply_markup: replyMarkup })
    return
  } catch (error) {
    log.debug({ err: error, url: offer.thumbnailUrl }, 'thumbnail url send failed')
  }

  let thumbPath = null
  try {
    thumbPath = await downloadThumbnail(offer.thumbnailUrl, downloadsDir)
    await ctx.replyWithPhoto(new InputFile(thumbPath), { caption, reply_markup: replyMarkup })
  } catch (error) {
    log.warn({ err: error, url: offer.thumbnailUrl }, 'thumbnail download failed, sending text only')
    await ctx.reply(caption, { reply_markup: replyMarkup })
  } finally {
    if (thumbPath) await fs.unlink(thumbPath).catch(() => {})
  }
}
