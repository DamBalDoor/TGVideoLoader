const settings = new Map()

export function getUserSettings(userId) {
  if (userId == null) return { advancedMode: false }
  return settings.get(userId) || { advancedMode: false }
}

export function setAdvancedMode(userId, enabled) {
  const next = { advancedMode: Boolean(enabled) }
  settings.set(userId, next)
  return next
}
