import { formatPeriodTitle, formatShortDate } from './time.js'

function cell(text, { header = false, align = 'center' } = {}) {
  return {
    text: String(text),
    ...(header ? { is_header: true } : {}),
    align,
    valign: 'middle',
  }
}

function paragraph(text) {
  return { type: 'paragraph', text: String(text) }
}

function heading(text, size = 3) {
  return { type: 'heading', size, text: String(text) }
}

function bulletList(items) {
  return {
    type: 'list',
    items: items.map((text) => ({
      blocks: [paragraph(text)],
    })),
  }
}

function buildDailyTable(daily) {
  const rows = [
    [
      cell('День', { header: true, align: 'left' }),
      cell('👤 Пользователи', { header: true }),
      cell('⬇️ Скачивания', { header: true }),
    ],
    ...daily.map((row) => [
      cell(formatShortDate(row.date), { align: 'left' }),
      cell(row.users),
      cell(row.downloads),
    ]),
  ]

  return {
    type: 'table',
    is_bordered: true,
    is_striped: true,
    is_compact: true,
    caption: 'Динамика по дням',
    cells: rows,
  }
}

export function buildRichAnalyticsReport(payload) {
  const blocks = [
    heading(`📊 Аналитика TGLoader · ${formatPeriodTitle(payload.fromDate, payload.toDate)}`, 2),
    paragraph(`👤 Уникальных пользователей: ${payload.uniqueUsers}`),
    paragraph(
      `⬇️ Скачиваний: ${payload.downloads.total} (видео: ${payload.downloads.video}, аудио: ${payload.downloads.audio})`,
    ),
    heading('Накопительно', 4),
    paragraph(
      `Месяц — 👤 ${payload.totals.uniqueUsersMonth}, ⬇️ ${payload.totals.downloadsMonth}`,
    ),
    paragraph(`Год — 👤 ${payload.totals.uniqueUsersYear}, ⬇️ ${payload.totals.downloadsYear}`),
    heading('Топ площадок', 4),
  ]

  if (payload.topPlatforms.length) {
    blocks.push(
      bulletList(payload.topPlatforms.map((item) => `${item.platform} — ${item.count}`)),
    )
  } else {
    blocks.push(paragraph('Нет данных'))
  }

  if (payload.daily.length > 1) {
    blocks.push(buildDailyTable(payload.daily))
  }

  return { blocks }
}
