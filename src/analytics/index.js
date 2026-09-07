import { openDatabase } from './db.js'
import { AnalyticsStore } from './store.js'
import { SettingsStore } from '../bot/settings-store.js'

export { startReportScheduler } from './scheduler.js'
export { formatDailyReport } from './report.js'

export async function createAppStores(config) {
  const conn = await openDatabase(config.analyticsDbPath)
  return {
    analytics: new AnalyticsStore(conn, { reportTimezone: config.reportTimezone }),
    settings: new SettingsStore(conn),
  }
}
