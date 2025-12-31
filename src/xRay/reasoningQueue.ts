// xRay/reasoningQueue.ts
// Database-backed queue for asynchronous reasoning generation

import PQueue from 'next/dist/compiled/p-queue'
import { loadReasoningConfig, ReasoningConfig } from './config'
import { generateStepReasoning } from './llmReasoning'
import { getExecutionById, updateStepReasoning } from '@/lib/storage'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'

export interface ReasoningJob {
  id: string                    // Unique job ID
  executionId: string           // Execution to update
  stepName: string              // Step to generate reasoning for
  attempt: number               // Current retry attempt (1-based)
  status: 'pending' | 'processing' | 'completed' | 'failed'
  createdAt: string            // ISO timestamp
  startedAt?: string           // When processing started
  completedAt?: string         // When finished
  error?: string               // Last error message
  nextRetryAt?: string         // Scheduled retry time
}

export interface QueueStats {
  pending: number
  processing: number
  completed: number
  failed: number
  totalJobs: number
}

export class ReasoningQueue {
  private static instance: ReasoningQueue | null = null

  private jobs: Map<string, ReasoningJob>
  private queue: PQueue
  private config: ReasoningConfig

  private constructor() {
    this.config = loadReasoningConfig()
    this.jobs = new Map()
    this.queue = new PQueue({ concurrency: this.config.concurrency })

    if (this.config.debug) {
      console.log('[XRay] Reasoning queue initialized', {
        concurrency: this.config.concurrency,
        maxRetries: this.config.maxRetries,
        autoProcess: this.config.autoProcess
      })
    }
  }

  static getInstance(): ReasoningQueue {
    if (!this.instance) {
      this.instance = new ReasoningQueue()
      // Load pending jobs from database on startup
      this.instance.loadPendingJobs().catch(error => {
        console.error('[XRay] Failed to load pending jobs from database:', error)
      })
    }
    return this.instance
  }

  /**
   * Load pending jobs from database (for recovery after restart)
   */
  private async loadPendingJobs(): Promise<void> {
    try {
      const pendingJobs = await prisma.reasoningJob.findMany({
        where: {
          status: { in: ['pending', 'processing'] }
        }
      })

      if (pendingJobs.length > 0) {
        console.log(`[XRay] Found ${pendingJobs.length} pending jobs in database, re-enqueuing...`)

        for (const dbJob of pendingJobs) {
          // Create in-memory job
          const job: ReasoningJob = {
            id: dbJob.id,
            executionId: dbJob.executionId,
            stepName: dbJob.stepName,
            attempt: dbJob.attempts,
            status: 'pending',
            createdAt: dbJob.createdAt.toISOString()
          }

          this.jobs.set(job.id, job)

          // Re-enqueue
          this.queue.add(() => this.processJob(job.id))
        }

        console.log(`[XRay] Re-enqueued ${pendingJobs.length} jobs from database`)
      }
    } catch (error) {
      console.error('[XRay] Failed to load pending jobs from database:', error)
    }
  }

  /**
   * Enqueue a single step for reasoning generation
   * Returns jobId for tracking
   */
  async enqueue(executionId: string, stepName: string): Promise<string> {
    const jobId = randomUUID()

    const job: ReasoningJob = {
      id: jobId,
      executionId,
      stepName,
      attempt: 1,
      status: 'pending',
      createdAt: new Date().toISOString()
    }

    this.jobs.set(jobId, job)

    // Persist job to database
    try {
      // Get the internal database ID for the execution
      const execution = await prisma.execution.findUnique({
        where: { executionId },
        select: { id: true }
      })

      if (execution) {
        await prisma.reasoningJob.create({
          data: {
            id: jobId,
            executionId: execution.id, // Use internal ID, not user-facing executionId
            stepName,
            status: 'pending',
            attempts: 1
          }
        })
      }
    } catch (error) {
      console.error(`[XRay] Failed to persist job to database:`, error)
      // Continue anyway - job is in memory
    }

    // Add to queue
    this.queue.add(() => this.processJob(jobId))

    console.log(`[XRay] Reasoning job enqueued: ${executionId}/${stepName}`)

    return jobId
  }

  /**
   * Enqueue all steps from an execution
   * Returns array of jobIds
   */
  async enqueueExecution(executionId: string): Promise<string[]> {
    const execution = await getExecutionById(executionId)
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`)
    }

    const jobIds: string[] = []

    for (const step of execution.steps) {
      // Only enqueue steps without reasoning
      if (!step.reasoning) {
        const jobId = await this.enqueue(executionId, step.name)
        jobIds.push(jobId)
      }
    }

    return jobIds
  }

  /**
   * Process a single job
   * Includes retry logic with exponential backoff
   */
  private async processJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId)
    if (!job) {
      console.error(`[XRay] Job ${jobId} not found`)
      return
    }

    job.status = 'processing'
    job.startedAt = new Date().toISOString()

    // Update job status in database
    try {
      await prisma.reasoningJob.update({
        where: { id: jobId },
        data: { status: 'processing' }
      })
    } catch (error) {
      console.error(`[XRay] Failed to update job status in database:`, error)
    }

    if (this.config.debug) {
      console.log(`[XRay] Processing job ${jobId} (attempt ${job.attempt}/${this.config.maxRetries})`)
    }

    try {
      console.log(`[XRay] 🔄 Loading execution ${job.executionId} from storage...`)

      // Load execution from storage (read-only, to get step data for LLM)
      const execution = await getExecutionById(job.executionId)
      if (!execution) {
        throw new Error(`Execution ${job.executionId} not found`)
      }
      console.log(`[XRay] ✓ Loaded execution with ${execution.steps.length} steps`)

      // Find the step
      const step = execution.steps.find((s: any) => s.name === job.stepName)
      if (!step) {
        throw new Error(`Step ${job.stepName} not found in execution ${job.executionId}`)
      }
      console.log(`[XRay] ✓ Found step: ${job.stepName}`)

      // Skip if reasoning already exists (idempotency)
      if (step.reasoning) {
        console.log(`[XRay] ⏭️  Reasoning already exists for ${job.stepName}: "${step.reasoning.substring(0, 50)}...", skipping`)
        job.status = 'completed'
        job.completedAt = new Date().toISOString()
        return
      }

      // Generate reasoning (this is the LLM call)
      console.log(`[XRay] 🤖 Calling LLM for ${job.stepName}...`)
      console.log(`[XRay] 🔑 Using server's OpenAI key for reasoning generation`)
      const reasoning = await generateStepReasoning(step)
      console.log(`[XRay] ✓ LLM returned reasoning (${reasoning.length} chars): "${reasoning.substring(0, 100)}..."`)

      // ✨ ATOMIC UPDATE: Use new function that locks load-modify-write cycle
      // This prevents race conditions when multiple jobs update different steps
      console.log(`[XRay] 💾 Atomically updating reasoning in storage...`)
      await updateStepReasoning(job.executionId, job.stepName, reasoning)
      console.log(`[XRay] ✓ Reasoning saved to storage`)

      // Mark job as completed
      job.status = 'completed'
      job.completedAt = new Date().toISOString()

      // Update job status in database
      try {
        await prisma.reasoningJob.update({
          where: { id: jobId },
          data: {
            status: 'completed',
            reasoning,
            completedAt: new Date()
          }
        })
      } catch (error) {
        console.error(`[XRay] Failed to update completed job in database:`, error)
      }

      console.log(`[XRay] ✅ Generated reasoning for ${job.executionId}/${job.stepName}`)

    } catch (error: any) {
      console.error(`[XRay] ❌ Error processing job ${jobId}:`, error.message)
      console.error(`[XRay] ❌ Error stack:`, error.stack)
      await this.handleJobError(job, error)
    }
  }

  /**
   * Handle job error with retry logic
   */
  private async handleJobError(job: ReasoningJob, error: any): Promise<void> {
    const errorMessage = error.message || String(error)
    job.error = errorMessage

    // Check if error is retryable
    const isRetryable = this.isRetryableError(error)

    if (isRetryable && job.attempt < this.config.maxRetries) {
      // Schedule retry with exponential backoff
      const delay = this.config.retryDelays[job.attempt - 1] || 8000
      job.attempt++
      job.status = 'pending'
      job.nextRetryAt = new Date(Date.now() + delay).toISOString()

      console.warn(
        `[XRay] Retry ${job.attempt}/${this.config.maxRetries} for ${job.stepName} in ${delay}ms (${errorMessage})`
      )

      // Schedule retry
      setTimeout(() => {
        this.queue.add(() => this.processJob(job.id))
      }, delay)

    } else {
      // Max retries reached or non-retryable error
      job.status = 'failed'
      job.completedAt = new Date().toISOString()

      // Update job status in database
      try {
        await prisma.reasoningJob.update({
          where: { id: job.id },
          data: {
            status: 'failed',
            error: errorMessage,
            attempts: job.attempt,
            completedAt: new Date()
          }
        })
      } catch (dbError) {
        console.error(`[XRay] Failed to update failed job in database:`, dbError)
      }

      console.error(
        `[XRay] ✗ Failed to generate reasoning for ${job.executionId}/${job.stepName} after ${job.attempt} attempts: ${errorMessage}`
      )
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    const errorMessage = error.message || String(error)
    const errorCode = error.code

    // Retryable error codes/messages
    const retryablePatterns = [
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      'rate_limit_exceeded',
      'service_unavailable',
      'timeout',
      '429', // Rate limit
      '503', // Service unavailable
      '502', // Bad gateway
    ]

    return retryablePatterns.some(pattern =>
      errorMessage.includes(pattern) || errorCode === pattern
    )
  }

  /**
   * Process all steps in an execution manually
   * Waits for completion
   */
  async processExecution(executionId: string): Promise<void> {
    const jobIds = await this.enqueueExecution(executionId)

    if (jobIds.length === 0) {
      console.log(`[XRay] No pending reasoning for execution ${executionId}`)
      return
    }

    console.log(`[XRay] Processing ${jobIds.length} steps for execution ${executionId}`)

    // Wait for queue to complete
    await this.queue.onIdle()

    console.log(`[XRay] ✓ Completed processing for execution ${executionId}`)
  }

  /**
   * Get queue statistics (from memory)
   * For database stats, use getStatsFromDatabase()
   */
  getStats(): QueueStats {
    const jobs = Array.from(this.jobs.values())

    return {
      pending: jobs.filter(j => j.status === 'pending').length,
      processing: jobs.filter(j => j.status === 'processing').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length,
      totalJobs: jobs.length
    }
  }

  /**
   * Get queue statistics from database (persistent across restarts)
   */
  async getStatsFromDatabase(): Promise<QueueStats> {
    try {
      const [pending, processing, completed, failed, totalJobs] = await Promise.all([
        prisma.reasoningJob.count({ where: { status: 'pending' } }),
        prisma.reasoningJob.count({ where: { status: 'processing' } }),
        prisma.reasoningJob.count({ where: { status: 'completed' } }),
        prisma.reasoningJob.count({ where: { status: 'failed' } }),
        prisma.reasoningJob.count()
      ])

      return {
        pending,
        processing,
        completed,
        failed,
        totalJobs
      }
    } catch (error) {
      console.error('[XRay] Failed to get stats from database:', error)
      // Fallback to in-memory stats
      return this.getStats()
    }
  }

  /**
   * Get job by ID
   */
  getJob(jobId: string): ReasoningJob | undefined {
    return this.jobs.get(jobId)
  }

  /**
   * Clear all jobs (for testing)
   */
  clear(): void {
    this.jobs.clear()
    console.log('[XRay] Queue cleared')
  }

  /**
   * Get access to underlying p-queue for advanced usage
   */
  get pqueue(): PQueue {
    return this.queue
  }
}
