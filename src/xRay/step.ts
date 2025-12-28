export interface Step {
  name: string
  input: any
  output?: any
  error?: string
  metadata?: Record<string, any>  // ✅ ADDED: for logStep v1 API
  evaluations?: Array<{        
    id: string
    passed?: boolean
    metrics?: Record<string, any>
    filter_results?: Record<string, { passed: boolean, detail: string }>
    reasoning?: string
  }>
  filters_applied?: Record<string, {     
    value: any
    rule: string
  }>
  startedAt?: string
  endedAt?: string
  durationMs?: number
  timestamp: string
  reasoning?: string           
}
