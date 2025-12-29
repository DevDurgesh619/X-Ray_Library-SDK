# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

X-Ray is a Next.js-based pipeline observability framework that tracks, visualizes, and automatically explains multi-step AI/LLM pipeline executions. It captures pipeline steps and generates human-readable reasoning for each operation using a combination of rule-based heuristics and LLM-powered explanations.

## Development Commands

```bash
npm run dev    # Start development server on localhost:3000
npm run build  # Build for production
npm run start  # Start production server
npm run lint   # Run ESLint checks
```

## Core Architecture

### Three-Layer Structure

The codebase is organized into three main layers:

- **`src/xRay/`** - Core observability framework
  - `xray.ts` - Main XRay class for execution tracking
  - `execution.ts` - Execution data model interface
  - `step.ts` - Step data model interface
  - `llmReasoning.ts` - Automatic reasoning generation logic
  - `grokReasoner.ts` - Grok API integration for reasoning

- **`src/lib/`** - Shared utilities
  - `storage.ts` - File-based JSON persistence (`data/executions.json`)
  - `openaiReasoner.ts` - OpenAI integration for step reasoning
  - `grokReasoner.ts` - Grok LLM integration

- **`src/app/`** - Next.js application layer
  - `page.tsx` - Competitor selection dashboard
  - `movies/` - Movie recommendation feature
  - `execution/[id]/` - Execution detail view
  - `api/run-pipeline/` - POST endpoint for competitor pipeline
  - `api/run-movie-pipeline/` - POST endpoint for movie pipeline

- **`src/demo/`** - Demo implementations
  - `pipeline.ts` - Competitor selection pipeline
  - `moviePipeline.ts` - Movie recommendation pipeline
  - `fake*.ts` - Mock LLM and search services for testing without API calls

### Key Data Models

**Execution** - Container for a pipeline run
- `executionId` (UUID)
- `startedAt`, `endedAt` (ISO timestamps)
- `steps` (array of Step objects)
- `finalOutcome` (pipeline result)
- `metadata` (domain, pipeline type, etc.)

**Step** - Individual pipeline operation
- `name` (step identifier)
- `input`, `output` (operation data)
- `error` (if step failed)
- `startedAt`, `endedAt`, `durationMs` (timing)
- `reasoning` (auto-generated explanation)
- `metadata` (custom data)

## XRay Usage Pattern

The XRay class manages pipeline execution tracking using a three-phase step lifecycle:

```typescript
import { XRay } from "@/xRay"
import { saveExecution } from "@/lib/storage"

const xray = new XRay(executionId, { domain: "competitors", pipeline: "v1" })

// Phase 1: Start a step (synchronous)
xray.startStep("step_name", { input: "data" })

// Phase 2: End a step (async - triggers auto-reasoning)
await xray.endStep("step_name", { output: "results" })

// Or handle errors
await xray.errorStep("step_name", error)

// Phase 3: Complete execution
const execution = xray.end({ finalResult: "data" })
await saveExecution(execution)
```

**Important**: `endStep()` and `errorStep()` are async because they trigger automatic reasoning generation. Always await these calls.

## Automatic Reasoning System

The reasoning system uses a fallback chain to generate human-readable explanations:

### Fallback Chain Priority

1. **Rule-Based Heuristics** (fastest, most specific)
   - Located in `src/xRay/llmReasoning.ts` and root `RuleBasedReasoning.ts`
   - Detects common patterns:
     - Filter operations (`apply_filters` step name)
     - Search/retrieval (looks for `total_results`, `candidates_fetched`)
     - Evaluation counts (`total_evaluated`, `passed`, `failed`)
     - Selection/ranking (detects `selection` in output)
     - Theme/keyword extraction (`preference_understanding`, `keyword_generation`)
   - Returns formatted strings like: "Applied filters → 15/50 passed (35 failed)"

2. **LLM Fallback** (when no rules match)
   - Calls `grokExplainStep()` with step input/output
   - Generates contextual explanation via Grok API

3. **Generic Fallback** (if LLM fails)
   - Returns: "Completed '{step_name}' step in {duration}ms"

### How Reasoning Works

Reasoning is generated automatically when you call:
- `await xray.endStep(name, output)` - For successful steps
- `await xray.errorStep(name, error)` - For failed steps

The system analyzes the step's input/output structure and generates an explanation, which is stored in `step.reasoning`.

## Storage System

**File-Based JSON Persistence:**
- Location: `data/executions.json`
- Validation: Filters out executions with missing IDs or empty steps

**API Functions** (`src/lib/storage.ts`):
```typescript
saveExecution(execution)     // Upserts execution (updates if exists, creates if new)
getExecutions()              // Load all executions
getExecutionById(id)         // Fetch single execution by ID
```

## Code Organization Patterns

### Import Alias
Use `@/` prefix to reference the `src/` directory:
```typescript
import { XRay } from "@/xRay"
import { saveExecution } from "@/lib/storage"
```

### Async/Await Requirements
- `xray.startStep()` - Synchronous
- `xray.endStep()` - **Async** (must await)
- `xray.errorStep()` - **Async** (must await)

### API Routes
- `POST /api/run-pipeline` - Execute competitor selection pipeline
- `POST /api/run-movie-pipeline` - Execute movie recommendation pipeline

Both return `{ executionId }` for tracking

## Adding New Pipelines

To add a new pipeline:

1. **Create XRay instance**
```typescript
const xray = new XRay(crypto.randomUUID(), {
  domain: "your_domain",
  pipeline: "v1"
})
```

2. **Instrument each step**
```typescript
xray.startStep("operation_name", { input: data })
const result = await performOperation(data)
await xray.endStep("operation_name", { output: result })
```

3. **Save execution**
```typescript
const execution = xray.end({ decision: "final result" })
await saveExecution(execution)
```

4. **View in dashboard**
Navigate to `/execution/{executionId}` to see step-by-step breakdown with auto-generated reasoning

## Customizing Reasoning

To add custom reasoning patterns:

1. Edit `src/xRay/llmReasoning.ts`
2. Add pattern detection before the LLM fallback (line ~130)
3. Follow existing patterns:
```typescript
// Check step name or input/output structure
if (step.name === "my_step" || output.my_field) {
  return "Custom explanation based on data"
}
```

Place new rules **before** the `grokExplainStep()` call to take priority.

## Technical Stack

- **Framework**: Next.js 16.1.1 (App Router)
- **Language**: TypeScript 5 (strict mode enabled)
- **Styling**: Tailwind CSS 4
- **LLM Integration**: OpenAI SDK 6.15.0 (used for both OpenAI and Grok APIs)
- **Frontend**: React 19.2.3
- **Node**: Uses ES2017 target

## Environment Variables

Create `.env.local` for API keys:
```
OPENAI_API_KEY=your_key_here
GROK_API_KEY=your_key_here
```

Note: `.env.local` is not tracked in git.

## Key Architectural Insights

### Execution-Step-Reasoning Hierarchy
```
Execution (pipeline run container)
  └── Step[] (individual operations)
       └── Reasoning (auto-generated explanation)
```

### Step Lifecycle State Machine
1. `startStep()` creates step in `activeSteps` map
2. `endStep()` or `errorStep()` finalizes step:
   - Calculates duration
   - Generates reasoning via `generateStepReasoning()`
   - Moves step from active map to `execution.steps` array
3. `end()` completes entire execution

### Demo-Driven Testing
No formal test framework exists. Testing is done through:
- Competitor selection pipeline (`src/demo/pipeline.ts`)
- Movie recommendation pipeline (`src/demo/moviePipeline.ts`)
- Mock services (`src/demo/fake*.ts`) allow running pipelines without external API calls
