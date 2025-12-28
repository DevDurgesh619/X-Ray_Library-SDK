export interface Step {
  name: string
  input: any
  output?: any
  error?: string
  startedAt?: string
  endedAt?: string
  durationMs?: number
  timestamp: string
  metadata?: Record<string, any>
  reasoning?: string  // 🔥 NEW: Auto-generated
}
