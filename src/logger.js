import { createRequire } from 'node:module'
import dotenv from 'dotenv'
import path from 'node:path'
import { ROOT_DIR } from './constants.js'

dotenv.config({ path: path.join(ROOT_DIR, '.env') })

const require = createRequire(import.meta.url)
const pino = require('pino')

const LOG_LEVELS = new Set(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])

function parseBool(value, fallback) {
  if (value == null || value === '') return fallback
  const normalized = String(value).trim().toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false
  return fallback
}

export function resolveLogConfig(env = process.env) {
  const explicitLevel = (env.LOG_LEVEL || '').trim().toLowerCase()
  const level = LOG_LEVELS.has(explicitLevel)
    ? explicitLevel
    : env.NODE_ENV === 'production'
      ? 'info'
      : 'debug'

  const pretty = parseBool(env.LOG_PRETTY, env.NODE_ENV !== 'production')

  return { level, pretty }
}

export function createLogger(options = {}) {
  const { level, pretty } = resolveLogConfig(options.env)

  const base = {
    level,
    name: 'tgloader',
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level(label) {
        return { level: label }
      },
    },
    redact: {
      paths: ['botToken', 'token', 'authorization', 'cookie', 'cookies', 'password', 'secret'],
      censor: '[Redacted]',
    },
  }

  if (pretty) {
    return pino({
      ...base,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
    })
  }

  return pino(base)
}

export const logger = createLogger()

export function childLogger(bindings) {
  return logger.child(bindings)
}

export function logError(log, error, message, extra = {}) {
  if (error instanceof Error) {
    log.error({ err: error, ...extra }, message)
    return
  }
  log.error({ err: { value: String(error) }, ...extra }, message)
}
