import { childLogger } from '../../logger.js'

const log = childLogger({ module: 'auth' })

export function isAllowed(userId, config) {
  if (!config.allowedUserIds.size) return true
  return userId != null && config.allowedUserIds.has(userId)
}

export function authMiddleware(config) {
  return async (ctx, next) => {
    const userId = ctx.from?.id
    if (!isAllowed(userId, config)) {
      log.warn({ userId }, 'blocked by allowlist')
      if (ctx.callbackQuery) {
        await ctx.answerCallbackQuery({ text: 'Этот бот закрытый.', show_alert: true })
        return
      }
      await ctx.reply('Этот бот закрытый.')
      return
    }
    await next()
  }
}
