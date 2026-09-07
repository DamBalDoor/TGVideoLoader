export function loggingMiddleware(log) {
  return async (ctx, next) => {
    const updateId = ctx.update.update_id
    const userId = ctx.from?.id
    const updateType = Object.keys(ctx.update).find((key) => key !== 'update_id') || 'unknown'
    const payload = { updateId, userId, updateType }

    if (ctx.callbackQuery?.data) payload.callbackData = ctx.callbackQuery.data
    if (ctx.message?.text) payload.text = ctx.message.text.slice(0, 160)
    else if (ctx.message?.caption) payload.caption = ctx.message.caption.slice(0, 160)

    log.debug(payload, 'update received')
    const startedAt = Date.now()

    try {
      await next()
      log.debug({ ...payload, durationMs: Date.now() - startedAt }, 'update handled')
    } catch (error) {
      log.error({ err: error, ...payload, durationMs: Date.now() - startedAt }, 'update failed')
      throw error
    }
  }
}
