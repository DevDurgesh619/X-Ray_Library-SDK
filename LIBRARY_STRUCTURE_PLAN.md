# X-Ray Library Structure Plan

## Overview

Convert X-Ray from a monolithic Next.js app into a reusable library that can be:
1. **Published to NPM** as `@xray/sdk`
2. **Imported into any Node.js project**
3. **Used with or without the dashboard**

## Current Structure (Monolithic)

```
x-ray/
├── src/
│   ├── xRay/              # Core X-Ray logic (should be library)
│   │   ├── xray.ts
│   │   ├── execution.ts
│   │   ├── step.ts
│   │   ├── reasoningQueue.ts
│   │   ├── llmReasoning.ts
│   │   └── config.ts
│   ├── lib/               # Shared utilities
│   │   ├── storage.ts
│   │   ├── prisma.ts
│   │   └── openaiReasoner.ts
│   ├── app/               # Next.js UI (dashboard)
│   └── demo/              # Example pipelines
├── prisma/
│   └── schema.prisma
└── package.json
```

## Target Structure (Library + Dashboard)

```
x-ray/
├── packages/
│   ├── sdk/                          # @xray/sdk - NPM Library
│   │   ├── src/
│   │   │   ├── index.ts             # Main export
│   │   │   ├── XRay.ts              # Core XRay class
│   │   │   ├── ExecutionContext.ts  # Execution tracking
│   │   │   ├── types.ts             # TypeScript types
│   │   │   ├── storage/
│   │   │   │   ├── interface.ts     # Storage interface
│   │   │   │   ├── database.ts      # Database storage (Prisma)
│   │   │   │   └── memory.ts        # In-memory storage (testing)
│   │   │   ├── reasoning/
│   │   │   │   ├── queue.ts         # Reasoning queue
│   │   │   │   ├── generator.ts     # LLM reasoning
│   │   │   │   └── config.ts        # Configuration
│   │   │   └── utils/
│   │   │       └── logger.ts        # Logging utilities
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   ├── database/                     # @xray/database - Shared DB Schema
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   ├── src/
│   │   │   └── client.ts
│   │   └── package.json
│   │
│   └── dashboard/                    # @xray/dashboard - Next.js UI
│       ├── src/
│       │   ├── app/                  # Next.js pages
│       │   ├── components/           # React components
│       │   └── lib/                  # UI utilities
│       ├── package.json
│       └── next.config.js
│
├── examples/                          # Example integrations
│   ├── basic/                         # Simple usage
│   │   └── index.ts
│   ├── with-database/                 # With database persistence
│   │   └── index.ts
│   └── with-dashboard/                # Full setup with UI
│       └── index.ts
│
├── package.json                       # Root workspace config
├── turbo.json                         # Turborepo config (optional)
└── README.md                          # Main documentation
```

## Phase 1: Create Monorepo Structure

### Step 1: Initialize Monorepo

```bash
# Root package.json with workspaces
{
  "name": "xray-monorepo",
  "private": true,
  "workspaces": [
    "packages/*",
    "examples/*"
  ],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test"
  }
}
```

### Step 2: Create @xray/sdk Package

**packages/sdk/package.json**:
```json
{
  "name": "@xray/sdk",
  "version": "0.1.0",
  "description": "Lightweight execution tracing for LLM pipelines",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": [
    "dist",
    "README.md"
  ],
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "prepublishOnly": "npm run build"
  },
  "keywords": [
    "observability",
    "tracing",
    "llm",
    "pipeline",
    "monitoring"
  ],
  "dependencies": {
    "@xray/database": "workspace:*",
    "p-queue": "^8.0.0"
  },
  "peerDependencies": {
    "@prisma/client": "^5.22.0",
    "openai": "^6.0.0"
  },
  "peerDependenciesMeta": {
    "@prisma/client": {
      "optional": true
    },
    "openai": {
      "optional": true
    }
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0"
  },
  "license": "MIT"
}
```

### Step 3: SDK Entry Point

**packages/sdk/src/index.ts**:
```typescript
// Main exports
export { XRay } from './XRay'
export { ExecutionContext } from './ExecutionContext'

// Storage providers
export { DatabaseStorage } from './storage/database'
export { MemoryStorage } from './storage/memory'

// Reasoning
export { ReasoningQueue } from './reasoning/queue'
export { ReasoningConfig } from './reasoning/config'

// Types
export type {
  Execution,
  Step,
  ReasoningJob,
  StorageProvider,
  XRayConfig
} from './types'
```

### Step 4: Core XRay Class

**packages/sdk/src/XRay.ts**:
```typescript
import { ExecutionContext } from './ExecutionContext'
import { StorageProvider } from './types'
import { ReasoningQueue } from './reasoning/queue'

export interface XRayConfig {
  projectId?: string
  storage?: StorageProvider
  autoReasoning?: boolean
  reasoningEndpoint?: string
  apiKey?: string
}

export class XRay {
  private config: XRayConfig

  constructor(config: XRayConfig = {}) {
    this.config = {
      projectId: 'default',
      autoReasoning: true,
      ...config
    }
  }

  /**
   * Create an execution context for tracking
   */
  createExecution(executionId: string, metadata?: Record<string, any>): ExecutionContext {
    return new ExecutionContext({
      executionId,
      projectId: this.config.projectId!,
      metadata,
      storage: this.config.storage,
      autoReasoning: this.config.autoReasoning
    })
  }

  /**
   * Track a complete execution with automatic step recording
   */
  async trackExecution<T>(
    executionName: string,
    fn: (ctx: ExecutionContext) => Promise<T>
  ): Promise<T> {
    const executionId = `${executionName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const ctx = this.createExecution(executionId, { name: executionName })

    const startTime = Date.now()

    try {
      const result = await fn(ctx)

      ctx.setFinalOutcome(result)
      await ctx.save()

      return result
    } catch (error) {
      ctx.setError(error)
      await ctx.save()
      throw error
    }
  }
}
```

### Step 5: ExecutionContext

**packages/sdk/src/ExecutionContext.ts**:
```typescript
import { Execution, Step, StorageProvider } from './types'

export interface ExecutionContextConfig {
  executionId: string
  projectId: string
  metadata?: any
  storage?: StorageProvider
  autoReasoning?: boolean
}

export class ExecutionContext {
  private executionId: string
  private projectId: string
  private metadata: any
  private steps: Step[] = []
  private activeSteps = new Map<string, Step>()
  private finalOutcome: any = null
  private storage?: StorageProvider
  private autoReasoning: boolean

  constructor(config: ExecutionContextConfig) {
    this.executionId = config.executionId
    this.projectId = config.projectId
    this.metadata = config.metadata || {}
    this.storage = config.storage
    this.autoReasoning = config.autoReasoning ?? true
  }

  /**
   * Start tracking a step
   */
  startStep(name: string, input?: any, metadata?: any) {
    const step: Step = {
      name,
      input,
      timestamp: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      metadata
    }
    this.activeSteps.set(name, step)
  }

  /**
   * End a step with output
   */
  endStep(name: string, output: any) {
    const step = this.activeSteps.get(name)
    if (!step) {
      console.warn(`Step ${name} not found in active steps`)
      return
    }

    step.output = output
    step.endedAt = new Date().toISOString()
    step.durationMs = new Date(step.endedAt).getTime() - new Date(step.startedAt!).getTime()

    this.steps.push(step)
    this.activeSteps.delete(name)
  }

  /**
   * Record a step error
   */
  errorStep(name: string, error: Error) {
    const step = this.activeSteps.get(name)
    if (!step) {
      console.warn(`Step ${name} not found in active steps`)
      return
    }

    step.error = error.message
    step.endedAt = new Date().toISOString()
    step.durationMs = new Date(step.endedAt).getTime() - new Date(step.startedAt!).getTime()

    this.steps.push(step)
    this.activeSteps.delete(name)
  }

  /**
   * Convenience method: Execute a step function
   */
  async step<T>(
    stepName: string,
    fn: () => Promise<T> | T,
    input?: any
  ): Promise<T> {
    this.startStep(stepName, input)

    try {
      const output = await fn()
      this.endStep(stepName, output)
      return output
    } catch (error: any) {
      this.errorStep(stepName, error)
      throw error
    }
  }

  /**
   * Set final outcome
   */
  setFinalOutcome(outcome: any) {
    this.finalOutcome = outcome
  }

  /**
   * Set error
   */
  setError(error: any) {
    this.metadata.error = error.message
  }

  /**
   * Get execution data
   */
  toJSON(): Execution {
    return {
      executionId: this.executionId,
      projectId: this.projectId,
      startedAt: new Date().toISOString(),
      metadata: this.metadata,
      steps: this.steps,
      finalOutcome: this.finalOutcome
    }
  }

  /**
   * Save execution to storage
   */
  async save() {
    if (!this.storage) {
      console.warn('[XRay] No storage provider configured - execution not saved')
      return
    }

    const execution = this.toJSON()
    await this.storage.saveExecution(execution)

    // Trigger reasoning if enabled
    if (this.autoReasoning) {
      // TODO: Implement reasoning trigger
    }
  }

  getExecutionId(): string {
    return this.executionId
  }
}
```

### Step 6: Storage Interface

**packages/sdk/src/storage/interface.ts**:
```typescript
import { Execution } from '../types'

export interface StorageProvider {
  /**
   * Save an execution
   */
  saveExecution(execution: Execution): Promise<void>

  /**
   * Get execution by ID
   */
  getExecutionById(executionId: string): Promise<Execution | undefined>

  /**
   * Get all executions
   */
  getAllExecutions(): Promise<Execution[]>

  /**
   * Update step reasoning
   */
  updateStepReasoning(executionId: string, stepName: string, reasoning: string): Promise<void>
}
```

### Step 7: Database Storage Implementation

**packages/sdk/src/storage/database.ts**:
```typescript
import { StorageProvider } from './interface'
import { Execution } from '../types'
import { prisma } from '@xray/database'

export class DatabaseStorage implements StorageProvider {
  async saveExecution(execution: Execution): Promise<void> {
    // Same implementation as current storage.ts
    // ... (copy from current src/lib/storage.ts)
  }

  async getExecutionById(executionId: string): Promise<Execution | undefined> {
    // ... (copy from current src/lib/storage.ts)
  }

  async getAllExecutions(): Promise<Execution[]> {
    // ... (copy from current src/lib/storage.ts)
  }

  async updateStepReasoning(executionId: string, stepName: string, reasoning: string): Promise<void> {
    // ... (copy from current src/lib/storage.ts)
  }
}
```

### Step 8: Memory Storage (For Testing)

**packages/sdk/src/storage/memory.ts**:
```typescript
import { StorageProvider } from './interface'
import { Execution } from '../types'

export class MemoryStorage implements StorageProvider {
  private executions: Map<string, Execution> = new Map()

  async saveExecution(execution: Execution): Promise<void> {
    this.executions.set(execution.executionId, execution)
  }

  async getExecutionById(executionId: string): Promise<Execution | undefined> {
    return this.executions.get(executionId)
  }

  async getAllExecutions(): Promise<Execution[]> {
    return Array.from(this.executions.values())
  }

  async updateStepReasoning(executionId: string, stepName: string, reasoning: string): Promise<void> {
    const execution = this.executions.get(executionId)
    if (!execution) return

    const step = execution.steps.find(s => s.name === stepName)
    if (step) {
      step.reasoning = reasoning
    }
  }
}
```

### Step 9: Types Definition

**packages/sdk/src/types.ts**:
```typescript
export interface Execution {
  executionId: string
  projectId?: string
  startedAt: string
  endedAt?: string
  metadata?: Record<string, any>
  steps: Step[]
  finalOutcome?: any
}

export interface Step {
  name: string
  input?: any
  output?: any
  error?: string
  timestamp?: string
  startedAt?: string
  endedAt?: string
  durationMs?: number
  reasoning?: string
  metadata?: Record<string, any>
}

export interface ReasoningJob {
  id: string
  executionId: string
  stepName: string
  attempt: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  createdAt: string
  startedAt?: string
  completedAt?: string
  error?: string
  nextRetryAt?: string
}

export interface XRayConfig {
  projectId?: string
  storage?: StorageProvider
  autoReasoning?: boolean
  reasoningEndpoint?: string
  apiKey?: string
}

export interface StorageProvider {
  saveExecution(execution: Execution): Promise<void>
  getExecutionById(executionId: string): Promise<Execution | undefined>
  getAllExecutions(): Promise<Execution[]>
  updateStepReasoning(executionId: string, stepName: string, reasoning: string): Promise<void>
}
```

## Phase 2: Usage Examples

### Example 1: Basic Usage (No Database)

**examples/basic/index.ts**:
```typescript
import { XRay, MemoryStorage } from '@xray/sdk'

const xray = new XRay({
  projectId: 'my-app',
  storage: new MemoryStorage()
})

async function myPipeline() {
  await xray.trackExecution('user-pipeline', async (ctx) => {
    // Step 1: Fetch data
    const data = await ctx.step('fetch_data', async () => {
      return { users: [1, 2, 3] }
    })

    // Step 2: Process data
    const result = await ctx.step('process_data', async () => {
      return data.users.map(u => u * 2)
    })

    return result
  })
}

myPipeline()
```

### Example 2: With Database

**examples/with-database/index.ts**:
```typescript
import { XRay, DatabaseStorage } from '@xray/sdk'

const xray = new XRay({
  projectId: 'my-app',
  storage: new DatabaseStorage(),
  autoReasoning: true
})

async function myPipeline() {
  await xray.trackExecution('user-pipeline', async (ctx) => {
    const data = await ctx.step('fetch_data', async () => {
      return { users: [1, 2, 3] }
    })

    const result = await ctx.step('process_data', async () => {
      return data.users.map(u => u * 2)
    })

    return result
  })
}

myPipeline()
```

### Example 3: Manual Step Tracking

**examples/manual-tracking/index.ts**:
```typescript
import { XRay, DatabaseStorage } from '@xray/sdk'

const xray = new XRay({
  storage: new DatabaseStorage()
})

async function myPipeline() {
  const ctx = xray.createExecution('my-exec-123', {
    userId: 'user-456'
  })

  // Manual step tracking
  ctx.startStep('step1', { query: 'test' })
  const result1 = await fetchData()
  ctx.endStep('step1', result1)

  ctx.startStep('step2', { data: result1 })
  const result2 = await processData(result1)
  ctx.endStep('step2', result2)

  ctx.setFinalOutcome({ success: true })
  await ctx.save()
}

myPipeline()
```

## Phase 3: Publishing to NPM

### Step 1: Build the SDK

```bash
cd packages/sdk
npm run build

# Output: dist/index.js, dist/index.d.ts
```

### Step 2: Test Locally

```bash
# Link locally
cd packages/sdk
npm link

# Use in another project
cd /path/to/test-project
npm link @xray/sdk
```

### Step 3: Publish to NPM

```bash
cd packages/sdk
npm login
npm publish --access public
```

### Step 4: Install in Projects

```bash
npm install @xray/sdk
```

## Phase 4: Dashboard as Separate Package

The dashboard remains a separate Next.js app that uses the SDK:

**packages/dashboard/package.json**:
```json
{
  "name": "@xray/dashboard",
  "private": true,
  "dependencies": {
    "@xray/sdk": "workspace:*",
    "@xray/database": "workspace:*",
    "next": "^16.0.0",
    "react": "^19.0.0"
  }
}
```

Users can:
1. **Use SDK only** - No dashboard, just tracking
2. **Use SDK + Dashboard** - Deploy dashboard separately
3. **Use SDK + Remote Dashboard** - Point to hosted dashboard

## Migration Path

### Current Code → Library

1. **Move core files**:
   - `src/xRay/` → `packages/sdk/src/`
   - `src/lib/storage.ts` → `packages/sdk/src/storage/database.ts`
   - `src/lib/openaiReasoner.ts` → `packages/sdk/src/reasoning/generator.ts`

2. **Keep dashboard**:
   - `src/app/` → `packages/dashboard/src/app/`
   - `src/components/` → `packages/dashboard/src/components/`

3. **Update imports**:
   - Dashboard imports from `@xray/sdk`
   - No more direct file imports

## Benefits

1. **✅ Reusability** - Use in any Node.js project
2. **✅ Separation of Concerns** - SDK ≠ Dashboard
3. **✅ Optional Database** - Can use memory storage
4. **✅ Type Safety** - Full TypeScript support
5. **✅ NPM Distribution** - `npm install @xray/sdk`
6. **✅ Flexible** - Use with or without dashboard

## Next Steps

Would you like me to:
1. **Create the monorepo structure** with packages/
2. **Move existing code** into SDK package
3. **Create example integrations**
4. **Set up NPM publishing**

Let me know which step to start with!
