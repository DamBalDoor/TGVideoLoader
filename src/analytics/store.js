import { createHash } from 'node:crypto'
import { getDateKeyInTz, monthPrefix, yearPrefix } from './time.js'
import { queryCount, queryOne } from './db.js'

export class AnalyticsStore {
  constructor(conn, { reportTimezone }) {
    this.conn = conn
    this.reportTimezone = reportTimezone
  }

  currentDateKey() {
    return getDateKeyInTz(this.reportTimezone)
  }

  recordVisit(userId) {
    if (!userId) return
    const now = new Date().toISOString()
    const visitDate = this.currentDateKey()

    this.conn.db.run(
      `INSERT INTO users (user_id, first_seen, last_seen) VALUES (?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET last_seen = excluded.last_seen`,
      [userId, now, now],
    )
    this.conn.db.run(
      `INSERT OR IGNORE INTO daily_visits (user_id, visit_date) VALUES (?, ?)`,
      [userId, visitDate],
    )
    this.conn.persist()
  }

  recordDownload(userId, { mediaType = 'video', platform = null } = {}) {
    if (!userId) return
    const now = new Date().toISOString()
    const downloadDate = this.currentDateKey()

    this.conn.db.run(
      `INSERT INTO downloads (user_id, downloaded_at, download_date, media_type, platform)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, now, downloadDate, mediaType, platform],
    )
    this.conn.persist()
  }

  buildReportPayload(forDate) {
    const month = monthPrefix(forDate)
    const year = yearPrefix(forDate)

    const uniqueUsersDay = queryCount(
      this.conn.db,
      'SELECT COUNT(*) AS c FROM daily_visits WHERE visit_date = ?',
      [forDate],
    )
    const uniqueUsersMonth = queryCount(
      this.conn.db,
      'SELECT COUNT(DISTINCT user_id) AS c FROM daily_visits WHERE visit_date LIKE ?',
      [`${month}%`],
    )
    const uniqueUsersYear = queryCount(
      this.conn.db,
      'SELECT COUNT(DISTINCT user_id) AS c FROM daily_visits WHERE visit_date LIKE ?',
      [`${year}%`],
    )

    const downloadsDay = queryCount(
      this.conn.db,
      'SELECT COUNT(*) AS c FROM downloads WHERE download_date = ?',
      [forDate],
    )
    const downloadsDayVideo = queryCount(
      this.conn.db,
      `SELECT COUNT(*) AS c FROM downloads WHERE download_date = ? AND media_type = 'video'`,
      [forDate],
    )
    const downloadsDayAudio = queryCount(
      this.conn.db,
      `SELECT COUNT(*) AS c FROM downloads WHERE download_date = ? AND media_type = 'audio'`,
      [forDate],
    )
    const downloadsMonth = queryCount(
      this.conn.db,
      'SELECT COUNT(*) AS c FROM downloads WHERE download_date LIKE ?',
      [`${month}%`],
    )
    const downloadsYear = queryCount(
      this.conn.db,
      'SELECT COUNT(*) AS c FROM downloads WHERE download_date LIKE ?',
      [`${year}%`],
    )

    return {
      forDate,
      uniqueUsers: {
        day: uniqueUsersDay,
        month: uniqueUsersMonth,
        year: uniqueUsersYear,
      },
      downloads: {
        day: downloadsDay,
        dayVideo: downloadsDayVideo,
        dayAudio: downloadsDayAudio,
        month: downloadsMonth,
        year: downloadsYear,
      },
    }
  }

  hashPayload(payload) {
    return createHash('sha256').update(JSON.stringify(payload)).digest('hex')
  }

  getLastReportHash() {
    return this.getMeta('last_report_hash')
  }

  getLastReportSlot() {
    return this.getMeta('last_report_slot')
  }

  setLastReport(hash, forDate, slotKey) {
    this.setMeta('last_report_hash', hash)
    this.setMeta('last_report_for_date', forDate)
    this.setMeta('last_report_slot', slotKey)
    this.setMeta('last_report_sent_at', new Date().toISOString())
    this.conn.persist()
  }

  markReportSlot(slotKey) {
    this.setMeta('last_report_slot', slotKey)
    this.conn.persist()
  }

  getMeta(key) {
    const row = queryOne(this.conn.db, 'SELECT value FROM meta WHERE key = ?', [key])
    return row?.value ?? null
  }

  setMeta(key, value) {
    this.conn.db.run(
      `INSERT INTO meta (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [key, String(value)],
    )
  }
}
