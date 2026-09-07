import { createBot } from './bot/index.js'
import { loadConfig } from './config.js'
import { acquireLock } from './lock.js'
import { logger } from './logger.js'

const log = logger.child({ module: 'app' })

try {
  acquireLock()
  const config = loadConfig()
  const bot = createBot(config, log)

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
