import { InlineKeyboard } from 'grammy'
import { childLogger } from '../../logger.js'
import { getUserSettings, setAdvancedMode } from '../settings.js'

const log = childLogger({ module: 'settings' })

export function settingsText({ advancedMode }) {
  if (advancedMode) {
    return [
      'Расширенный режим включён.',
      '',
      'Показываю все кодеки, ширину и размер для каждого варианта.',
      'Чтобы вернуться к простому списку — выключи режим кнопкой ниже.',
    ].join('\n')
  }
  return [
    'Обычный режим.',
    '',
    'Показываю только разные разрешения в стандартном формате (H.264 / mp4).',
    'Нужны VP9, AV1 и прочие детали — включи расширенный режим.',
  ].join('\n')
}

export function settingsKeyboard({ advancedMode }) {
  const keyboard = new InlineKeyboard()
  if (advancedMode) {
    keyboard.text('Выключить расширенный режим', 'set:advanced:0')
  } else {
    keyboard.text('Включить расширенный режим', 'set:advanced:1')
  }
  return keyboard
}

export function registerSettingsHandlers(bot) {
  bot.command('settings', async (ctx) => {
    const userId = ctx.from?.id
    if (userId == null) return
    const current = getUserSettings(userId)
    log.debug({ userId, advancedMode: current.advancedMode }, '/settings')
    await ctx.reply(settingsText(current), { reply_markup: settingsKeyboard(current) })
  })

  bot.callbackQuery(/^set:advanced:/, async (ctx) => {
    const userId = ctx.from?.id
    if (userId == null) {
      await ctx.answerCallbackQuery()
      return
    }
    const enabled = (ctx.callbackQuery.data || '').endsWith(':1')
    const next = setAdvancedMode(userId, enabled)
    log.info({ userId, advancedMode: next.advancedMode }, 'settings updated')
    await ctx.answerCallbackQuery({
      text: enabled ? 'Расширенный режим включён' : 'Обычный режим',
    })
    try {
      await ctx.editMessageText(settingsText(next), { reply_markup: settingsKeyboard(next) })
    } catch {
      await ctx.reply(settingsText(next), { reply_markup: settingsKeyboard(next) })
    }
  })
}
