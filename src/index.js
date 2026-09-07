import { createAppStores, startReportScheduler } from './analytics/index.js'
import { createBot } from './bot/index.js'
import { loadConfig } from './config.js'
import { maybeUpdateYtdlp } from './download/ytdlp-update.js'
import { acquireLock } from './lock.js'
import { logger } from './logger.js'

const log = logger.child({ module: 'app' })

try {
  acquireLock()
  const config = loadConfig()
  await maybeUpdateYtdlp(config, log.child({ module: 'ytdlp-update' }))
  const { analytics, settings } = await createAppStores(config)
  const bot = createBot(config, log, { analytics, settings })
  startReportScheduler({ bot, analytics, config, log: log.child({ module: 'analytics' }) })

  log.info('TGLoader started')
  await bot.start({
    onStart: (info) => {
      log.info({ username: info.username, botId: info.id }, 'polling started')
    },
  })
} catch (error) {
  log.fatal({ err: error }, 'startup failed')
  process.exit(1)
}
