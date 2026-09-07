export class UserFacingError extends Error {
  constructor(message) {
    super(message)
    this.name = 'UserFacingError'
    this.userMessage = message
  }
}

export function humanizeYtdlpError(raw, platform) {
  const text = String(raw || '').toLowerCase()

  if (text.includes('unexpected response from webpage') || text.includes('unable to extract challenge')) {
    return `${platform}: сайт не отдал видео без браузерной сессии. Добавь cookies в .env (COOKIES_FILE или COOKIES_FROM_BROWSER) и попробуй снова.`
  }
  if (
    text.includes('private') ||
    text.includes('login') ||
    text.includes('sign in') ||
    text.includes('cookies') ||
    text.includes('registered users')
  ) {
    return `${platform}: видео недоступно без входа. Добавь cookies из браузера в .env (COOKIES_FILE или COOKIES_FROM_BROWSER).`
  }
  if (text.includes('age-restrict') || text.includes('confirm your age') || text.includes('adult content')) {
    return `${platform}: ролик с возрастным ограничением. Нужны cookies авторизованного аккаунта.`
  }
  if (text.includes('unavailable') || text.includes('not available') || text.includes('removed')) {
    return `${platform}: видео недоступно или удалено.`
  }
  if (text.includes('unsupported')) {
    return `${platform}: такую ссылку скачать не умею.`
  }
  if (text.includes('keyerror') && text.includes('params')) {
    return `${platform}: не нашёл прямую ссылку на файл. Если ролик открывается только после входа, добавь cookies в .env.`
  }
  if (text.includes('no such option')) {
    return `${platform}: внутренняя ошибка загрузчика. Перезапусти бота или обнови yt-dlp.`
  }
  return `Не удалось скачать видео с ${platform}. Проверь, что ролик открывается в браузере.`
}
