import youtubeDlModule from 'youtube-dl-exec'

const youtubeDl = youtubeDlModule?.default ?? youtubeDlModule
const spawnOpts = { windowsHide: true }

export const YTDLP_PATH = youtubeDl.constants.YOUTUBE_DL_PATH

export async function extractInfo(url, config, ffmpegPath) {
  try {
    const info = await youtubeDl(
      url,
      buildFlags(config, ffmpegPath, {
        dumpSingleJson: true,
        skipDownload: true,
        quiet: true,
      }),
      spawnOpts,
    )
    if (info && typeof info === 'object') return info
    if (typeof info === 'string' && info.trim().startsWith('{')) {
      return JSON.parse(info)
    }
    throw new Error(String(info || 'empty yt-dlp response'))
  } catch (error) {
    throw wrap(error)
  }
}

export async function downloadVideo(url, config, ffmpegPath, { output, format, onProgress }) {
  try {
    const subprocess = youtubeDl.exec(
      url,
      buildFlags(config, ffmpegPath, {
        output,
        format,
        mergeOutputFormat: 'mp4',
        newline: true,
      }),
      spawnOpts,
    )
    const onChunk = (chunk) => {
      const percent = parseProgress(String(chunk))
      if (percent != null) onProgress?.(percent)
    }
    subprocess.stdout?.on('data', onChunk)
    subprocess.stderr?.on('data', onChunk)
    await subprocess
  } catch (error) {
    throw wrap(error)
  }
}

function buildFlags(config, ffmpegPath, extra = {}) {
  const flags = {
    noPlaylist: true,
    noWarnings: true,
    restrictFilenames: true,
    overwrites: true,
    retries: 3,
    fragmentRetries: 5,
    socketTimeout: 30,
    ffmpegLocation: ffmpegPath,
    ...extra,
  }
  if (config.cookiesFile) flags.cookies = config.cookiesFile
  if (config.cookiesFromBrowser) flags.cookiesFromBrowser = config.cookiesFromBrowser
  return flags
}

function parseProgress(text) {
  const match = text.match(/(\d{1,3}(?:\.\d+)?)%/)
  if (!match) return null
  const value = Number.parseFloat(match[1])
  return Number.isFinite(value) ? Math.min(99, value) : null
}

function wrap(error) {
  const raw = error.stderr || error.message || String(error)
  const wrapped = new Error(raw)
  wrapped.raw = raw
  wrapped.stderr = error.stderr
  return wrapped
}
