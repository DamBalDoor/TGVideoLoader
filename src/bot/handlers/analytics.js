import { formatExtendedReport } from '../../analytics/report.js'
import { buildRichAnalyticsReport } from '../../analytics/rich-report.js'
import { getPeriodRange } from '../../analytics/time.js'
import { childLogger } from '../../logger.js'

const log = childLogger({ module: 'analytics-cmd' })

function isAdmin(userId, config) {
  return config.adminUserId != null && userId === config.adminUserId
}

function parsePeriod(text) {
  const arg = (text || '').trim().split(/\s+/).slice(1)[0]?.toLowerCase()
  if (arg === 'week' || arg === 'неделя') return 'week'
  return 'today'
}

async function sendAnalyticsReport(ctx, payload) {
  try {
    await ctx.replyWithRichMessage(buildRichAnalyticsReport(payload))
    return
  } catch (error) {
    log.warn({ err: error }, 'rich analytics failed, fallback to HTML text')
  }

  await ctx.reply(formatExtendedReport(payload), { parse_mode: 'HTML' })
}

export function registerAnalyticsHandler(bot, { config, analytics }) {
  const handler = async (ctx) => {
    const userId = ctx.from?.id
    if (!isAdmin(userId, config)) return

    if (!analytics) {
      await ctx.reply('Аналитика недоступна.')
      return
    }

    const period = parsePeriod(ctx.message?.text || '')
    const { fromDate, toDate } = getPeriodRange(period, config.reportTimezone)
    const payload = analytics.buildExtendedPayload(fromDate, toDate)
    log.debug({ userId, period, fromDate, toDate }, '/analytics')
    await sendAnalyticsReport(ctx, payload)
  }

  bot.command('analytics', handler)
  bot.command('analitics', handler)
}
