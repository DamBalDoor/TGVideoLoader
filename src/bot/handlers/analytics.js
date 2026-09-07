import { formatDailyReport } from '../../analytics/report.js'
import { getDateKeyInTz } from '../../analytics/time.js'
import { childLogger } from '../../logger.js'

const log = childLogger({ module: 'analytics-cmd' })

function isAdmin(userId, config) {
  return config.adminUserId != null && userId === config.adminUserId
}

export function registerAnalyticsHandler(bot, { config, analytics }) {
  const handler = async (ctx) => {
    const userId = ctx.from?.id
    if (!isAdmin(userId, config)) return

    if (!analytics) {
      await ctx.reply('Аналитика недоступна.')
      return
    }

    const today = getDateKeyInTz(config.reportTimezone)
    const payload = analytics.buildReportPayload(today)
    log.debug({ userId, today }, '/analytics')
    await ctx.reply(formatDailyReport(payload))
  }

  bot.command('analytics', handler)
  bot.command('analitics', handler)
}
