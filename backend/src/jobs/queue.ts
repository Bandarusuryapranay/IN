import { EventEmitter } from 'events'
import Queue from 'bull'

interface Job {
  id:          string
  name:        string
  data:        any
  attempts:    number
  maxAttempts: number
}

type JobHandler = (job: Job) => Promise<any>

class SimpleQueue {
  private queueName:  string
  private jobs:       Job[] = []
  private processing: boolean = false
  private handler:    JobHandler | null = null
  private emitter:    EventEmitter = new EventEmitter()
  private bullQueue:  Queue.Queue | null = null

  constructor(name: string) {
    this.queueName = name
    
    // If REDIS_URL is set, use Bull for actual persistence
    if (process.env.REDIS_URL) {
      this.bullQueue = new Queue(name, process.env.REDIS_URL, {
        redis: {
          tls: process.env.REDIS_URL.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined
        }
      })
      console.log(`[Queue:${name}] 🚀 Initialized with Redis (Bull)`)
    } else {
      console.log(`[Queue:${name}] ️⚠️ Initialized with In-Memory mode (Development)`)
    }
  }

  async add(name: string, data: any, opts?: { attempts?: number }): Promise<Job | any> {
    if (this.bullQueue) {
      return this.bullQueue.add(name, data, { attempts: opts?.attempts || 3 })
    }

    const job: Job = {
      id:          `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name,
      data,
      attempts:    0,
      maxAttempts: opts?.attempts || 3,
    }
    this.jobs.push(job)
    setImmediate(() => this.processNext())
    return job
  }

  process(name: string, handler: JobHandler): void {
    if (this.bullQueue) {
      this.bullQueue.process(name, async (bullJob) => {
        const job: Job = {
          id: String(bullJob.id),
          name: bullJob.name,
          data: bullJob.data,
          attempts: bullJob.attemptsMade,
          maxAttempts: bullJob.opts.attempts || 3
        }
        return handler(job)
      })

      this.bullQueue.on('completed', (job, result) => this.emitter.emit('completed', job, result))
      this.bullQueue.on('failed', (job, err) => this.emitter.emit('failed', job, err))
      return
    }

    this.handler = handler
  }

  on(event: string, listener: (...args: any[]) => void): this {
    this.emitter.on(event, listener)
    return this
  }

  schedule(intervalMs: number, name: string, data: any = {}): void {
    if (this.bullQueue) {
      // Bull supports repeatable jobs, but for simplicity we'll keep the interval behavior
      setInterval(() => this.add(name, data), intervalMs)
      return
    }
    setInterval(() => this.add(name, data), intervalMs)
  }

  private async processNext(): Promise<void> {
    if (this.processing || this.jobs.length === 0 || !this.handler) return
    this.processing = true

    const job = this.jobs.shift()!
    job.attempts++

    try {
      const result = await this.handler(job)
      this.emitter.emit('completed', job, result)
    } catch (err: any) {
      if (job.attempts < job.maxAttempts) {
        const delay = Math.pow(2, job.attempts) * 1000
        setTimeout(() => {
          this.jobs.unshift(job)
          this.processNext()
        }, delay)
      } else {
        this.emitter.emit('failed', job, err)
        console.error(`[Queue:${this.queueName}] Job failed after ${job.attempts} attempts:`, err.message)
      }
    } finally {
      this.processing = false
      if (this.jobs.length > 0) setImmediate(() => this.processNext())
    }
  }
}

export const poolGenerationQueue = new SimpleQueue('pool-generation')
export const gapAnalysisQueue    = new SimpleQueue('gap-analysis')
export const jwtCleanupQueue     = new SimpleQueue('jwt-cleanup')