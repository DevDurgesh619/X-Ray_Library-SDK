# ✅ On-Demand Reasoning (Lazy Loading)

## Overview

X-Ray now uses **on-demand reasoning generation** - reasoning is only generated when the user clicks on a specific execution, not when the pipeline runs.

## Behavior

### Before (Auto-Reasoning)
```
1. User calls pipeline API
   ↓
2. Pipeline executes & saves to DB
   ↓
3. Auto-enqueue reasoning for ALL steps
   ↓ LLM calls start immediately
4. Return execution ID
   ↓
5. User sees execution on dashboard
   ↓ Reasoning already generating in background
6. User clicks execution
   ↓
7. Reasoning shows up (already completed or in progress)
```

### After (On-Demand Reasoning)
```
1. User calls pipeline API
   ↓
2. Pipeline executes & saves to DB
   ↓
3. Return execution ID immediately
   ↓ NO reasoning generation
4. User sees execution on dashboard
   ↓ Steps show without reasoning
5. User clicks execution
   ↓ 🔥 TRIGGER: Reasoning generation starts NOW
6. ExecutionReasoningTrigger component fires
   ↓ POST /api/reasoning/process
7. Jobs enqueued & LLM calls start
   ↓
8. UI shows loading spinners
   ↓
9. Reasoning appears dynamically (2s polling)
```

## How It Works

### 1. Pipeline API (No Auto-Reasoning)
**Files**:
- [src/app/api/run-pipeline/route.ts](src/app/api/run-pipeline/route.ts)
- [src/app/api/run-movie-pipeline/route.ts](src/app/api/run-movie-pipeline/route.ts)

```typescript
export async function POST() {
  const { execution } = await runPipeline(executionId)

  // Save execution to database immediately (without reasoning)
  await saveExecution(execution)

  // ❌ DON'T enqueue reasoning here
  // Reasoning will be triggered only when user views the execution detail page

  // Return immediately
  return NextResponse.json({ executionId })
}
```

### 2. Execution Detail Page (Auto-Trigger)
**File**: [src/app/execution/[id]/page.tsx](src/app/execution/[id]/page.tsx)

```typescript
export default async function ExecutionPage({ params }) {
  const { id } = await params
  const execution = await getExecutionById(id)

  // Check if any steps are missing reasoning
  const hasAnyMissingReasoning = execution.steps.some(s => !s.reasoning)

  return (
    <main>
      {/* Auto-trigger reasoning generation (once per execution) */}
      <ExecutionReasoningTrigger
        executionId={execution.executionId}
        hasAnyMissingReasoning={hasAnyMissingReasoning}
      />

      {/* Steps with dynamic reasoning */}
      {execution.steps.map((step) => (
        <StepReasoning
          executionId={execution.executionId}
          stepName={step.name}
          initialReasoning={step.reasoning}
        />
      ))}
    </main>
  )
}
```

### 3. ExecutionReasoningTrigger Component
**File**: [src/app/components/ExecutionReasoningTrigger.tsx](src/app/components/ExecutionReasoningTrigger.tsx)

```typescript
export default function ExecutionReasoningTrigger({
  executionId,
  hasAnyMissingReasoning
}) {
  useEffect(() => {
    if (!hasAnyMissingReasoning) return

    // Check if already triggered (localStorage)
    const storageKey = `reasoningTriggered:${executionId}`
    const wasTriggered = localStorage.getItem(storageKey)

    if (!wasTriggered) {
      // Trigger reasoning generation
      fetch("/api/reasoning/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ executionId })
      }).then(response => {
        if (response.ok) {
          localStorage.setItem(storageKey, "true")
          console.log(`[UI] Triggered reasoning for ${executionId}`)
        }
      })
    }
  }, [executionId, hasAnyMissingReasoning])

  return null // Side-effect only component
}
```

### 4. StepReasoning Component (Polling)
**File**: [src/app/components/StepReasoning.tsx](src/app/components/StepReasoning.tsx)

```typescript
export default function StepReasoning({ executionId, stepName, initialReasoning }) {
  const [reasoning, setReasoning] = useState(initialReasoning)
  const [isLoading, setIsLoading] = useState(!initialReasoning)

  useEffect(() => {
    if (initialReasoning) {
      setIsLoading(false)
      return
    }

    // Wait 3 seconds, then poll every 2 seconds
    const initialDelay = setTimeout(() => {
      const pollInterval = setInterval(async () => {
        const response = await fetch(`/api/execution/${executionId}`)
        const execution = await response.json()
        const step = execution.steps.find(s => s.name === stepName)

        if (step?.reasoning) {
          setReasoning(step.reasoning)
          setIsLoading(false)
          clearInterval(pollInterval)
        }
      }, 2000)
    }, 3000)
  }, [executionId, stepName, initialReasoning])

  if (isLoading) {
    return (
      <div className="loading">
        <Spinner />
        Generating reasoning...
      </div>
    )
  }

  return <div className="reasoning">🤖 Auto-Reasoning: {reasoning}</div>
}
```

### 5. Reasoning Process API
**File**: [src/app/api/reasoning/process/route.ts](src/app/api/reasoning/process/route.ts)

```typescript
export async function POST(request: Request) {
  const { executionId } = await request.json()

  const queue = ReasoningQueue.getInstance()

  // Process the execution (enqueue all steps without reasoning)
  await queue.processExecution(executionId)

  return NextResponse.json({
    success: true,
    executionId,
    stats: queue.getStats()
  })
}
```

## Flow Diagram

```
┌────────────────────────────────────────────────────────┐
│              1. User Calls Pipeline API                │
│  POST /api/run-pipeline                                │
│                                                        │
│  ├─ Run pipeline                      ~100ms          │
│  ├─ Save to database                  ~30ms           │
│  └─ Return { executionId }            ✅ INSTANT      │
└────────────────────────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│              2. User Sees Dashboard                    │
│  GET /                                                 │
│                                                        │
│  Shows list of executions (no reasoning yet)          │
│  ├─ execution-1                                        │
│  ├─ execution-2                                        │
│  └─ execution-3                                        │
└────────────────────────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│         3. User Clicks on execution-1                  │
│  GET /execution/execution-1                            │
│                                                        │
│  🔥 ExecutionReasoningTrigger fires                   │
│  └─ POST /api/reasoning/process                        │
│     { executionId: "execution-1" }                     │
└────────────────────────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│         4. Reasoning Queue Processes                   │
│                                                        │
│  ├─ Enqueue step_1 → Database                          │
│  ├─ Enqueue step_2 → Database                          │
│  └─ Enqueue step_3 → Database                          │
│                                                        │
│  Processing (3 concurrent workers):                    │
│  ├─ Job 1: LLM call → Save reasoning → Complete       │
│  ├─ Job 2: LLM call → Save reasoning → Complete       │
│  └─ Job 3: LLM call → Save reasoning → Complete       │
└────────────────────────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│         5. UI Updates Dynamically                      │
│                                                        │
│  StepReasoning polls every 2 seconds:                  │
│  GET /api/execution/execution-1                        │
│                                                        │
│  ├─ step_1: ⏳ Loading... → ✅ Reasoning appears      │
│  ├─ step_2: ⏳ Loading... → ✅ Reasoning appears      │
│  └─ step_3: ⏳ Loading... → ✅ Reasoning appears      │
└────────────────────────────────────────────────────────┘
```

## Benefits

### ✅ Performance
- **API responds instantly** (~150ms) - no LLM calls
- **Database saves immediately** - execution visible on dashboard
- **Reasoning only when needed** - saves API costs

### ✅ Cost Savings
- **No wasted LLM calls** - only generate reasoning for executions users actually view
- **Example**: If you run 100 pipelines but only view 10, you save 90% of LLM costs

### ✅ User Experience
- **Instant feedback** - see execution immediately
- **Loading indicators** - users know reasoning is being generated
- **Responsive UI** - doesn't block navigation

### ✅ Database Persistence
- **Jobs tracked in database** - can query job status
- **Survives restarts** - pending jobs resume automatically
- **Audit trail** - see which executions have reasoning

## Configuration

The behavior is controlled by localStorage (per-execution):

```typescript
// Check if reasoning was already triggered
const storageKey = `reasoningTriggered:${executionId}`
const wasTriggered = localStorage.getItem(storageKey)

if (!wasTriggered) {
  // Trigger reasoning
  fetch("/api/reasoning/process", ...)
  localStorage.setItem(storageKey, "true")
}
```

**Result**: Reasoning is triggered **once per execution** when first viewed.

## Manual Triggering

You can also manually trigger reasoning for any execution:

```bash
curl -X POST http://localhost:3000/api/reasoning/process \
  -H "Content-Type: application/json" \
  -d '{"executionId":"execution-1"}'
```

## Testing

### Test 1: Pipeline API Returns Instantly
```bash
# Should return in ~150ms (NO LLM calls)
time curl -X POST http://localhost:3000/api/run-pipeline

# Response: { "executionId": "abc-123" }
```

### Test 2: Dashboard Shows Execution Immediately
```bash
# Visit dashboard - execution should appear instantly
open http://localhost:3000

# No reasoning yet - just step names and input/output
```

### Test 3: Click Execution → Reasoning Generates
```bash
# Click on execution - reasoning generation triggered
open http://localhost:3000/execution/abc-123

# Watch console logs:
# [UI] Triggered reasoning generation for abc-123
# [XRay] Reasoning job enqueued: abc-123/step_1
# [XRay] Processing job...
# [XRay] ✅ Generated reasoning for step_1
```

### Test 4: Reload Page → Reasoning Persists
```bash
# Reload page - reasoning should still be there
# LocalStorage prevents re-triggering
```

## Environment Variables

```bash
# .env.local
XRAY_AUTO_REASONING=true   # Still needed for manual /api/reasoning/process endpoint
XRAY_REASONING_DEBUG=true  # Enable debug logging
```

**Note**: Even though `XRAY_AUTO_REASONING=true`, reasoning is NOT auto-triggered on pipeline execution. It's only triggered when viewing execution details.

## Files Modified

1. **src/app/api/run-pipeline/route.ts** - Removed auto-enqueueing
2. **src/app/api/run-movie-pipeline/route.ts** - Removed auto-enqueueing

## Files Unchanged (Already Working)

1. **src/app/components/ExecutionReasoningTrigger.tsx** - Already triggers on-demand
2. **src/app/components/StepReasoning.tsx** - Already polls for updates
3. **src/app/execution/[id]/page.tsx** - Already includes trigger component
4. **src/app/api/reasoning/process/route.ts** - Already processes execution
5. **src/xRay/reasoningQueue.ts** - Already handles async processing

## Comparison with Previous Behavior

| Feature | Before (JSON) | After (Database) |
|---------|---------------|------------------|
| Pipeline API speed | ~150ms | ~150ms ✅ |
| Reasoning trigger | On click execution | On click execution ✅ |
| Reasoning storage | In-memory queue | Database ✅ |
| Job persistence | Lost on restart | Persisted ✅ |
| UI updates | Polling (2s) | Polling (2s) ✅ |
| Cost savings | Yes (on-demand) | Yes (on-demand) ✅ |

## Summary

The system now works **exactly like before** with JSON files:
- ✅ Pipeline API returns instantly
- ✅ Execution appears on dashboard immediately
- ✅ Reasoning is triggered **only when user clicks** on execution
- ✅ UI shows loading spinners and updates dynamically
- ✅ Jobs persist to database (bonus: survives restarts)

The only difference is that jobs are now persisted to the database instead of just in-memory!
