import { queryOne } from '../analytics/db.js'

const DEFAULT_SETTINGS = Object.freeze({ advancedMode: false })

export class SettingsStore {
  constructor(conn) {
    this.conn = conn
    this.cache = new Map()
  }

  get(userId) {
    if (userId == null) return { ...DEFAULT_SETTINGS }

    const cached = this.cache.get(userId)
    if (cached) return cached

    const row = queryOne(
      this.conn.db,
      'SELECT advanced_mode FROM user_settings WHERE user_id = ?',
      [userId],
    )
    const settings = { advancedMode: Boolean(row?.advanced_mode) }
    this.cache.set(userId, settings)
    return settings
  }

  setAdvancedMode(userId, enabled) {
    if (userId == null) return { ...DEFAULT_SETTINGS }

    const next = { advancedMode: Boolean(enabled) }
    const now = new Date().toISOString()

    this.conn.db.run(
      `INSERT INTO user_settings (user_id, advanced_mode, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         advanced_mode = excluded.advanced_mode,
         updated_at = excluded.updated_at`,
      [userId, next.advancedMode ? 1 : 0, now],
    )
    this.conn.persist()
    this.cache.set(userId, next)
    return next
  }
}
