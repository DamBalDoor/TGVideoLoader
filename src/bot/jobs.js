import { JOB_TTL_MS } from '../constants.js'

const jobs = new Map()
const userJobs = new Map()

function purge() {
  const now = Date.now()
  for (const [jobId, job] of jobs) {
    if (now - job.createdAt > JOB_TTL_MS) {
      jobs.delete(jobId)
      if (userJobs.get(job.userId) === jobId) userJobs.delete(job.userId)
    }
  }
}

export function createJob({ userId, chatId, offer }) {
  purge()
  const jobId = crypto.randomUUID().replaceAll('-', '').slice(0, 8)
  const previous = userJobs.get(userId)
  if (previous) jobs.delete(previous)
  const job = {
    jobId,
    userId,
    chatId,
    offer,
    createdAt: Date.now(),
  }
  jobs.set(jobId, job)
  userJobs.set(userId, jobId)
  return job
}

export function getJob(jobId) {
  purge()
  const job = jobs.get(jobId)
  if (!job) return null
  if (Date.now() - job.createdAt > JOB_TTL_MS) {
    dropJob(jobId)
    return null
  }
  return job
}

export function dropJob(jobId) {
  const job = jobs.get(jobId)
  jobs.delete(jobId)
  if (job && userJobs.get(job.userId) === jobId) userJobs.delete(job.userId)
  return job || null
}
