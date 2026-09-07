import fs from 'node:fs'
import path from 'node:path'
import initSqlJs from 'sql.js'
import { ROOT_DIR } from '../constants.js'

const WASM_DIR = path.join(ROOT_DIR, 'node_modules', 'sql.js', 'dist')

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  user_id INTEGER PRIMARY KEY,
  first_seen TEXT NOT NULL,
  last_seen TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS daily_visits (
  user_id INTEGER NOT NULL,
  visit_date TEXT NOT NULL,
  PRIMARY KEY (user_id, visit_date)
);

CREATE TABLE IF NOT EXISTS downloads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  downloaded_at TEXT NOT NULL,
  download_date TEXT NOT NULL,
  media_type TEXT NOT NULL,
  platform TEXT
);

CREATE INDEX IF NOT EXISTS idx_daily_visits_date ON daily_visits(visit_date);
CREATE INDEX IF NOT EXISTS idx_downloads_date ON downloads(download_date);

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`

export async function openDatabase(dbPath) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true })
  const SQL = await initSqlJs({ locateFile: (file) => path.join(WASM_DIR, file) })

  let db
  if (fs.existsSync(dbPath)) {
    db = new SQL.Database(fs.readFileSync(dbPath))
  } else {
    db = new SQL.Database()
  }

  db.run('PRAGMA foreign_keys = ON')
  db.exec(SCHEMA)

  const persist = () => {
    fs.writeFileSync(dbPath, Buffer.from(db.export()))
  }

  return { db, persist, dbPath }
}

export function queryOne(db, sql, params = []) {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  if (!stmt.step()) {
    stmt.free()
    return null
  }
  const row = stmt.getAsObject()
  stmt.free()
  return row
}

export function queryCount(db, sql, params = []) {
  const row = queryOne(db, sql, params)
  return Number(row?.c ?? 0)
}
