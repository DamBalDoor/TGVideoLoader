import { formatPeriodTitle, formatRussianDate, formatShortDate } from './time.js'

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

export function formatExtendedReport(payload) {
  const lines = [
    `📊 Аналитика TGLoader · ${formatPeriodTitle(payload.fromDate, payload.toDate)}`,
    '',
    `👤 Уникальных пользователей: ${payload.uniqueUsers}`,
    `⬇️ Скачиваний: ${payload.downloads.total} (видео: ${payload.downloads.video}, аудио: ${payload.downloads.audio})`,
    '',
    'Накопительно:',
    `• Месяц — 👤 ${payload.totals.uniqueUsersMonth}, ⬇️ ${payload.totals.downloadsMonth}`,
    `• Год — 👤 ${payload.totals.uniqueUsersYear}, ⬇️ ${payload.totals.downloadsYear}`,
  ]

  if (payload.topPlatforms.length) {
    lines.push('', 'Топ площадок:')
    for (const item of payload.topPlatforms) {
      lines.push(`• ${item.platform} — ${item.count}`)
    }
  } else {
    lines.push('', 'Топ площадок: нет данных')
  }

  if (payload.daily.length > 1) {
    lines.push('', 'Динамика по дням:', formatDailyChartPlain(payload.daily))
  }

  return lines.join('\n')
}

function formatDailyChartPlain(daily) {
  const lines = []
  lines.push(`${'День'.padEnd(8)}${'Users'.padStart(6)}${'DL'.padStart(6)}`)
  for (const row of daily) {
    lines.push(
      `${formatShortDate(row.date).padEnd(8)}${String(row.users).padStart(6)}${String(row.downloads).padStart(6)}`,
    )
  }
  return ['<pre>', ...lines, '</pre>'].join('\n')
}
