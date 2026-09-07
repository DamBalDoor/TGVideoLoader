import { HELP_TEXT } from '../../constants.js'

export function registerCommandHandlers(bot) {
  bot.command('start', async (ctx) => {
    await ctx.reply(`Привет. ${HELP_TEXT}`)
  })

  bot.command('help', async (ctx) => {
    await ctx.reply(HELP_TEXT)
  })
}
