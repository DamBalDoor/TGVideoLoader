export function analyticsMiddleware(analytics) {
  return async (ctx, next) => {
    analytics.recordVisit(ctx.from?.id)
    await next()
  }
}
