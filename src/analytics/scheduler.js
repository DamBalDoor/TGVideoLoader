import { formatDailyReport } from './report.js'
import { getYesterdayDateKey, getZonedParts } from './time.js'

export function startReportScheduler({ bot, analytics, config, log }) {
  if (!config.adminUserId) {
    log.info('ADMIN_USER_ID not set — daily analytics report disabled')
    return
  }

  const tickMs = 30_000
  let lastInMemorySlot = null

  setInterval(async () => {
    try {
      const now = new Date()
      const parts = getZonedParts(config.reportTimezone, now)
      const hour = Number.parseInt(parts.hour, 10)
      const minute = Number.parseInt(parts.minute, 10)

      if (hour !== config.reportHour || minute !== config.reportMinute) return

      const slotKey = `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
      if (lastInMemorySlot === slotKey) return
      lastInMemorySlot = slotKey

      if (analytics.getLastReportSlot() === slotKey) return

      const reportDate = getYesterdayDateKey(config.reportTimezone, now)
      const payload = analytics.buildReportPayload(reportDate)
      const hash = analytics.hashPayload(payload)
      const lastHash = analytics.getLastReportHash()

      if (isEmptyPayload(payload) && !lastHash) {
        log.debug({ reportDate, slotKey }, 'analytics report skipped — no data yet')
        analytics.setLastReport(hash, reportDate, slotKey)
        return
      }

      if (lastHash && hash === lastHash) {
        log.debug({ reportDate, slotKey }, 'analytics report skipped — no changes since last notification')
        analytics.markReportSlot(slotKey)
        return
      }

      const text = formatDailyReport(payload)
      await bot.api.sendMessage(config.adminUserId, text)
      analytics.setLastReport(hash, reportDate, slotKey)
      log.info({ adminUserId: config.adminUserId, reportDate, slotKey }, 'daily analytics report sent')
    } catch (error) {
      log.error({ err: error }, 'daily report scheduler failed')
    }
  }, tickMs)

  log.info(
    {
      adminUserId: config.adminUserId,
      timezone: config.reportTimezone,
      at: `${String(config.reportHour).padStart(2, '0')}:${String(config.reportMinute).padStart(2, '0')}`,
    },
    'daily analytics scheduler started',
  )
}

function isEmptyPayload(payload) {
  return (
    payload.uniqueUsers.day === 0 &&
    payload.uniqueUsers.month === 0 &&
    payload.uniqueUsers.year === 0 &&
    payload.downloads.day === 0 &&
    payload.downloads.month === 0 &&
    payload.downloads.year === 0
  )
}
