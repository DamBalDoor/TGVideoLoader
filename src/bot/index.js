import { Bot } from 'grammy'
import { UPLOAD_TIMEOUT_SEC } from '../constants.js'
import { Downloader } from '../download/index.js'
import { logError } from '../logger.js'
import { BusyRegistry } from './busy.js'
import { registerCommandHandlers } from './handlers/commands.js'
import { registerLinkHandler } from './handlers/link.js'
import { registerSettingsHandlers } from './handlers/settings.js'
import { registerQualityHandler } from './handlers/quality.js'
import { authMiddleware } from './middlewares/auth.js'
import { loggingMiddleware } from './middlewares/logging.js'

export function createBot(config, log) {
  const botLog = log.child({ module: 'bot' })
  const bot = new Bot(config.botToken, {
    client: { timeoutSeconds: UPLOAD_TIMEOUT_SEC },
  })
  const downloader = new Downloader(config)
  const busy = new BusyRegistry()

  bot.use(loggingMiddleware(botLog.child({ module: 'grammy' })))
  bot.use(authMiddleware(config))
  registerCommandHandlers(bot)
  registerSettingsHandlers(bot)
  registerQualityHandler(bot, { downloader, busy, config })
  registerLinkHandler(bot, { downloader, busy, config })

  bot.catch((error) => {
    logError(botLog, error.error ?? error, 'bot middleware error', {
      updateId: error.ctx?.update?.update_id,
    })
  })

  return bot
}
