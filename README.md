# TGLoader

Telegram-бот на Node.js: кидаешь ссылку — бот показывает качества, разрешение и размер, затем скачивает выбранный вариант.

Поддерживает YouTube, VK, Rutube, Instagram, TikTok, X (Twitter), OK.ru и Pinterest.

## Запуск

1. Создай бота в [@BotFather](https://t.me/BotFather) и скопируй токен.
2. Скопируй `.env.example` в `.env` и вставь токен:

   ```
   BOT_TOKEN=123456:token
   ```

3. Поставь зависимости и запусти:

   ```
   npm install
   npm start
   ```

   Для разработки с автоперезапуском:

   ```
   npm run dev
   ```

   Логи пишет pino: в терминале — читаемый текст, иначе JSON. Уровень задаётся `LOG_LEVEL` в `.env` (`info` по умолчанию, `debug` — каждый апдейт Telegram).

4. Напиши боту `/start` и отправь ссылку.

## Структура

```
src/
  index.js                 точка входа
  config.js                .env
  logger.js                pino, child loggers по модулям
  constants.js
  urls.js                  разбор ссылок и площадок
  errors.js
  logger.js                pino
  lock.js                  один запущенный процесс
  bot/                     Telegram: хендлеры, кнопки, сессии выбора
  download/                yt-dlp, ffmpeg, VK-эмбеды, качества
```

## Логирование

Бот пишет логи через [pino](https://getpino.io/). По умолчанию в терминале — читаемый вывод (`pino-pretty`), в production — JSON.

Переменные в `.env`:

```
LOG_LEVEL=info
LOG_PRETTY=1
```

Уровни: `fatal`, `error`, `warn`, `info`, `debug`, `trace`. Для отладки поставь `LOG_LEVEL=debug`. JSON вместо pretty: `LOG_PRETTY=0`.

## Если Instagram, TikTok или YouTube не качаются

Экспортируй `cookies.txt` из браузера и укажи путь в `.env`:

```
COOKIES_FILE=C:\path\to\cookies.txt
```

Либо:

```
COOKIES_FROM_BROWSER=chrome
```

## Ограничения

Telegram Bot API принимает файлы до 50 МБ. Длинные видео бот сжимает; совсем большие отправить не сможет.
