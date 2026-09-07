import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const ROOT_DIR = path.resolve(__dirname, '..')
export const DOWNLOADS_DIR = path.join(ROOT_DIR, 'downloads')
export const DATA_DIR = path.join(ROOT_DIR, 'data')

export const TELEGRAM_MAX_BYTES = 50 * 1024 * 1024
export const SAFE_UPLOAD_BYTES = 49 * 1024 * 1024
export const JOB_TTL_MS = 30 * 60 * 1000
export const UPLOAD_TIMEOUT_SEC = 600

export const VIDEO_EXTENSIONS = new Set(['.mp4', '.mkv', '.webm', '.mov', '.m4v', '.avi'])
export const VIDEO_EXTS = new Set(['mp4', 'webm', 'mkv', 'mov', 'm4v', 'avi'])
export const AUDIO_EXTENSIONS = new Set(['.m4a', '.mp3', '.mp4', '.webm', '.ogg', '.opus', '.wav', '.aac'])

export const HELP_TEXT = [
  'Пришли ссылку на видео — покажу доступные качества, размер и разрешение, а после выбора скачаю и отправлю файл.',
  'Можно выбрать только аудио.',
  '',
  'Работает с:',
  '• YouTube',
  '• VK',
  '• Rutube',
  '• Instagram (Reels и посты)',
  '• TikTok',
  '• X (Twitter)',
  '• OK.ru',
  '• Pinterest',
  '',
  'Лимит Telegram для бота — 50 МБ. Варианты больше лимита помечу.',
  '',
  '/settings — обычный или расширенный выбор качества.',
].join('\n')

export const PLATFORMS = {
  YouTube: [
    'youtube.com',
    'youtu.be',
    'youtube-nocookie.com',
    'music.youtube.com',
    'm.youtube.com',
  ],
  VK: ['vk.com', 'vk.ru', 'm.vk.com', 'vkontakte.ru', 'vkvideo.ru', 'm.vkvideo.ru', 'vk.cc'],
  Rutube: ['rutube.ru', 'rutub.ru'],
  Instagram: ['instagram.com', 'instagr.am'],
  TikTok: ['tiktok.com', 'tiktokv.com', 'tiktokv.us', 'tiktok.com.tr'],
  X: ['twitter.com', 'x.com', 'mobile.twitter.com', 'mobile.x.com'],
  OK: ['ok.ru', 'odnoklassniki.ru', 'm.ok.ru'],
  Pinterest: ['pinterest.com', 'pin.it', 'pinterest.ru'],
}
