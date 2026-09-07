import { createHash } from 'node:crypto'
import { getDateKeyInTz, iterDateKeys, monthPrefix, yearPrefix } from './time.js'
import { queryAll, queryCount, queryOne } from './db.js'

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

  buildExtendedPayload(fromDate, toDate) {
    const uniqueUsers = queryCount(
      this.conn.db,
      `SELECT COUNT(DISTINCT user_id) AS c FROM daily_visits
       WHERE visit_date >= ? AND visit_date <= ?`,
      [fromDate, toDate],
    )

    const downloadsTotal = queryCount(
      this.conn.db,
      `SELECT COUNT(*) AS c FROM downloads WHERE download_date >= ? AND download_date <= ?`,
      [fromDate, toDate],
    )
    const downloadsVideo = queryCount(
      this.conn.db,
      `SELECT COUNT(*) AS c FROM downloads
       WHERE download_date >= ? AND download_date <= ? AND media_type = 'video'`,
      [fromDate, toDate],
    )
    const downloadsAudio = queryCount(
      this.conn.db,
      `SELECT COUNT(*) AS c FROM downloads
       WHERE download_date >= ? AND download_date <= ? AND media_type = 'audio'`,
      [fromDate, toDate],
    )

    const topPlatforms = queryAll(
      this.conn.db,
      `SELECT platform, COUNT(*) AS count FROM downloads
       WHERE download_date >= ? AND download_date <= ? AND platform IS NOT NULL AND platform != ''
       GROUP BY platform ORDER BY count DESC, platform ASC LIMIT 5`,
      [fromDate, toDate],
    ).map((row) => ({ platform: String(row.platform), count: Number(row.count) }))

    const usersByDate = new Map(
      queryAll(
        this.conn.db,
        `SELECT visit_date AS date, COUNT(DISTINCT user_id) AS users FROM daily_visits
         WHERE visit_date >= ? AND visit_date <= ?
         GROUP BY visit_date`,
        [fromDate, toDate],
      ).map((row) => [String(row.date), Number(row.users)]),
    )

    const downloadsByDate = new Map(
      queryAll(
        this.conn.db,
        `SELECT download_date AS date, COUNT(*) AS downloads FROM downloads
         WHERE download_date >= ? AND download_date <= ?
         GROUP BY download_date`,
        [fromDate, toDate],
      ).map((row) => [String(row.date), Number(row.downloads)]),
    )

    const daily = iterDateKeys(fromDate, toDate).map((date) => ({
      date,
      users: usersByDate.get(date) || 0,
      downloads: downloadsByDate.get(date) || 0,
    }))

    const month = monthPrefix(toDate)
    const year = yearPrefix(toDate)

    return {
      fromDate,
      toDate,
      uniqueUsers,
      downloads: {
        total: downloadsTotal,
        video: downloadsVideo,
        audio: downloadsAudio,
      },
      topPlatforms,
      daily,
      totals: {
        uniqueUsersMonth: queryCount(
          this.conn.db,
          'SELECT COUNT(DISTINCT user_id) AS c FROM daily_visits WHERE visit_date LIKE ?',
          [`${month}%`],
        ),
        uniqueUsersYear: queryCount(
          this.conn.db,
          'SELECT COUNT(DISTINCT user_id) AS c FROM daily_visits WHERE visit_date LIKE ?',
          [`${year}%`],
        ),
        downloadsMonth: queryCount(
          this.conn.db,
          'SELECT COUNT(*) AS c FROM downloads WHERE download_date LIKE ?',
          [`${month}%`],
        ),
        downloadsYear: queryCount(
          this.conn.db,
          'SELECT COUNT(*) AS c FROM downloads WHERE download_date LIKE ?',
          [`${year}%`],
        ),
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
