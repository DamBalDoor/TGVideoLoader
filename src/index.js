import { createBot } from './bot/index.js'
import { loadConfig } from './config.js'
import { acquireLock } from './lock.js'

try {
  acquireLock()
  const config = loadConfig()
  const bot = createBot(config)

  console.info('TGLoader started (Node.js)')
  await bot.start({
    onStart: (info) => {
      console.info(`Polling @${info.username}`)
    },
  })
} catch (error) {
  console.error(error.message || error)
  process.exit(1)
}
