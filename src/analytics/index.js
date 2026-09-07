import { openDatabase } from './db.js'
import { AnalyticsStore } from './store.js'

export { startReportScheduler } from './scheduler.js'
export { formatDailyReport } from './report.js'

export async function createAnalytics(config) {
  const conn = await openDatabase(config.analyticsDbPath)
  return new AnalyticsStore(conn, { reportTimezone: config.reportTimezone })
}
