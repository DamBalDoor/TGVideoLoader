export function isAllowed(userId, config) {
  if (!config.allowedUserIds.size) return true
  return userId != null && config.allowedUserIds.has(userId)
}

export function authMiddleware(config) {
  return async (ctx, next) => {
    const userId = ctx.from?.id
    if (!isAllowed(userId, config)) {
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
