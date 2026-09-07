import { HELP_TEXT } from '../../constants.js'
import { childLogger } from '../../logger.js'

const log = childLogger({ module: 'commands' })

export function registerCommandHandlers(bot) {
  bot.command('start', async (ctx) => {
    log.debug({ userId: ctx.from?.id }, '/start')
    await ctx.reply(`Привет. ${HELP_TEXT}`)
  })

  bot.command('help', async (ctx) => {
    log.debug({ userId: ctx.from?.id }, '/help')
    await ctx.reply(HELP_TEXT)
  })
}
