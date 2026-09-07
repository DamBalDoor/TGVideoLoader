import { InlineKeyboard } from 'grammy'
import { formatButtonText } from '../download/formats.js'
import { formatDuration } from '../utils.js'

export function offerText(offer) {
  const lines = [`${offer.platform}: ${offer.title.slice(0, 200)}`]
  const duration = formatDuration(offer.duration)
  if (duration) lines.push(`Длительность: ${duration}`)
  lines.push('')
  lines.push('На кнопке: ширина x высота, кодек и размер.')
  lines.push('Одинаковая высота при разном размере — это разные кодеки или разная ширина.')
  lines.push('Лимит Telegram — 50 МБ. Если больше, попробую сжать.')
  return lines.join('\n')
}

export function offerKeyboard(job) {
  const keyboard = new InlineKeyboard()
  job.offer.choices.forEach((choice, index) => {
    keyboard.text(formatButtonText(choice), `q:${job.jobId}:${index}`).row()
  })
  keyboard.text('Отмена', `q:${job.jobId}:c`)
  return keyboard
}
