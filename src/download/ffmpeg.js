import fs from 'node:fs'
import { spawn } from 'node:child_process'
import ffmpegStaticModule from 'ffmpeg-static'
import { UserFacingError } from '../errors.js'

const ffmpegStatic = ffmpegStaticModule?.default ?? ffmpegStaticModule

export function getFfmpegPath() {
  if (!ffmpegStatic || typeof ffmpegStatic !== 'string' || !fs.existsSync(ffmpegStatic)) {
    throw new UserFacingError('Не удалось подготовить ffmpeg. Перезапусти бота и попробуй снова.')
  }
  return ffmpegStatic
}

export function probeDuration(file) {
  return new Promise((resolve) => {
    const child = spawn(getFfmpegPath(), ['-i', file], { windowsHide: true })
    let stderr = ''
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })
    child.on('error', () => resolve(null))
    child.on('close', () => {
      const match = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/)
      if (!match) {
        resolve(null)
        return
      }
      resolve(Number(match[1]) * 3600 + Number(match[2]) * 60 + Number.parseFloat(match[3]))
    })
  })
}

export function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(getFfmpegPath(), args, { windowsHide: true })
    let stderr = ''
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        resolve()
        return
      }
      console.error('ffmpeg failed:', stderr.slice(-800))
      reject(new UserFacingError('Не получилось обработать видео. Попробуй другое качество или другую ссылку.'))
    })
  })
}
