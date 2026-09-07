import { InlineKeyboard } from 'grammy'
import {
  formatAudioButtonText,
  formatButtonText,
  formatSimpleButtonText,
} from '../download/formats.js'
import { formatDuration } from '../utils.js'

function choiceLabel(choice, advancedMode) {
  if (choice.mediaType === 'audio') return formatAudioButtonText(choice)
  return advancedMode ? formatButtonText(choice) : formatSimpleButtonText(choice)
}

export function offerText(offer) {
  const lines = [`${offer.platform}: ${offer.title.slice(0, 200)}`]
  const duration = formatDuration(offer.duration)
  if (duration) lines.push(`Длительность: ${duration}`)
  lines.push('')
  if (offer.advancedMode) {
    lines.push('На кнопке: ширина x высота, кодек и размер. Внизу — варианты аудио.')
    lines.push('Одинаковая высота при разном размере — это разные кодеки или разная ширина.')
  } else {
    lines.push('Выбери разрешение или «Аудио» — скачаю в обычном формате (H.264 / AAC).')
    lines.push('/settings — расширенный режим с кодеками и деталями.')
  }
  lines.push('Лимит Telegram — 50 МБ. Если больше, попробую сжать.')
  return lines.join('\n')
}

export function offerKeyboard(job) {
  const keyboard = new InlineKeyboard()
  job.offer.choices.forEach((choice, index) => {
    keyboard.text(choiceLabel(choice, job.offer.advancedMode), `q:${job.jobId}:${index}`).row()
  })
  keyboard.text('Отмена', `q:${job.jobId}:c`)
  return keyboard
}
