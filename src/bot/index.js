import { Bot } from 'grammy'
import { UPLOAD_TIMEOUT_SEC } from '../constants.js'
import { Downloader } from '../download/index.js'
import { BusyRegistry } from './busy.js'
import { registerCommandHandlers } from './handlers/commands.js'
import { registerLinkHandler } from './handlers/link.js'
import { registerQualityHandler } from './handlers/quality.js'
import { authMiddleware } from './middlewares/auth.js'

export function createBot(config) {
  const bot = new Bot(config.botToken, {
    client: { timeoutSeconds: UPLOAD_TIMEOUT_SEC },
  })
  const downloader = new Downloader(config)
  const busy = new BusyRegistry()

  bot.use(authMiddleware(config))
  registerCommandHandlers(bot)
  registerQualityHandler(bot, { downloader, busy, config })
  registerLinkHandler(bot, { downloader, busy })

  bot.catch((error) => {
    console.error('Bot error:', error)
  })

  return bot
}
