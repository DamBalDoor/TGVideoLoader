import { formatRussianDate } from './time.js'

export function formatDailyReport(payload) {
  const { forDate, uniqueUsers, downloads } = payload
  const lines = [
    `📊 Отчёт TGLoader за ${formatRussianDate(forDate)}`,
    '',
    'Уникальные пользователи:',
    `• За сутки: ${uniqueUsers.day}`,
    `• За месяц: ${uniqueUsers.month}`,
    `• За год: ${uniqueUsers.year}`,
    '',
    'Скачивания:',
    `• За сутки: ${downloads.day} (видео: ${downloads.dayVideo}, аудио: ${downloads.dayAudio})`,
    `• За месяц: ${downloads.month}`,
    `• За год: ${downloads.year}`,
  ]
  return lines.join('\n')
}
