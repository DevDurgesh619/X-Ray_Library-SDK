// xRay/config.ts
// Configuration loader for reasoning queue

export interface ReasoningConfig {
  autoProcess: boolean        // Enable automatic reasoning generation
  concurrency: number          // Number of parallel LLM calls
  maxRetries: number           // Maximum retry attempts per job
  retryDelays: number[]        // Exponential backoff delays (ms)
  debug: boolean               // Enable verbose logging
}

export function loadReasoningConfig(): ReasoningConfig {
  return {
    autoProcess: process.env.XRAY_AUTO_REASONING === 'true',
    concurrency: parseInt(process.env.XRAY_REASONING_CONCURRENCY || '3', 10),
    maxRetries: parseInt(process.env.XRAY_REASONING_MAX_RETRIES || '4', 10),
    retryDelays: [1000, 2000, 4000, 8000], // 1s, 2s, 4s, 8s
    debug: process.env.XRAY_REASONING_DEBUG === 'true'
  }
}
