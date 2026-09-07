import fs from 'node:fs'
import path from 'node:path'
import { ROOT_DIR } from './constants.js'

const LOCK_FILE = path.join(ROOT_DIR, '.bot.lock')

export function acquireLock() {
  const pid = process.pid
  if (fs.existsSync(LOCK_FILE)) {
    const previous = Number.parseInt(fs.readFileSync(LOCK_FILE, 'utf8').trim(), 10)
    if (previous && isRunning(previous) && previous !== pid) {
      throw new Error(`Bot already running with pid ${previous}. Stop it before starting another instance.`)
    }
  }
  fs.writeFileSync(LOCK_FILE, String(pid), 'utf8')
  const release = () => {
    try {
      if (fs.existsSync(LOCK_FILE) && fs.readFileSync(LOCK_FILE, 'utf8').trim() === String(pid)) {
        fs.unlinkSync(LOCK_FILE)
      }
    } catch {
      // ignore
    }
  }
  process.on('exit', release)
  process.on('SIGINT', () => {
    release()
    process.exit(0)
  })
  process.on('SIGTERM', () => {
    release()
    process.exit(0)
  })
}

function isRunning(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return error && error.code === 'EPERM'
  }
}
