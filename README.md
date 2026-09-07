# TGLoader

Telegram-бот на Node.js: кидаешь ссылку — бот показывает качества, разрешение и размер, затем скачивает выбранный вариант.

Поддерживает YouTube, VK, Rutube, Instagram и TikTok.

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

4. Напиши боту `/start` и отправь ссылку.

## Структура

```
src/
  index.js                 точка входа
  config.js                .env
  constants.js
  urls.js                  разбор ссылок и площадок
  errors.js
  lock.js                  один запущенный процесс
  bot/                     Telegram: хендлеры, кнопки, сессии выбора
  download/                yt-dlp, ffmpeg, VK-эмбеды, качества
```

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
