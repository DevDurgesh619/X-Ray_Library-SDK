# X-Ray Architecture & Data Flow - Complete Overview

## 📊 Big Picture: How Everything Works Together

X-Ray is an **observability platform for LLM pipelines** that tracks, logs, and explains multi-step executions. Think of it like "Application Performance Monitoring (APM)" but specifically designed for AI/ML pipelines.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    YOUR APPLICATION                          │
│  (demo-app, your own app, any Node.js/TypeScript project)  │
│                                                              │
│  1. Import xray-sdk from npm                                │
│  2. Track pipeline steps (input, output, timing)           │
│  3. Submit logs via HTTP API                                │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ HTTP POST /api/logs
                   │ (API Key authentication)
                   ▼
┌─────────────────────────────────────────────────────────────┐
│              X-RAY BACKEND (Next.js on Vercel)              │
│  URL: https://x-ray-library-sdk-...vercel.app              │
│                                                              │
│  ┌──────────────────────────────────────────────┐          │
│  │  API Routes (Next.js App Router)             │          │
│  │  ├─ POST /api/logs          (submit logs)    │          │
│  │  ├─ GET  /api/execution/:id (retrieve logs)  │          │
│  │  ├─ POST /api/run-pipeline  (demo pipeline)  │          │
│  │  └─ POST /api/reasoning/... (AI reasoning)   │          │
│  └──────────────────┬───────────────────────────┘          │
│                     │                                        │
│                     │ Prisma ORM                            │
│                     ▼                                        │
│  ┌──────────────────────────────────────────────┐          │
│  │         Database Layer (Prisma)              │          │
│  │  - User authentication                       │          │
│  │  - API key validation                        │          │
│  │  - Save execution data                       │          │
│  │  - Query executions                          │          │
│  └──────────────────┬───────────────────────────┘          │
└────────────────────┼────────────────────────────────────────┘
                     │
                     │ PostgreSQL Connection
                     ▼
┌─────────────────────────────────────────────────────────────┐
│          NEON POSTGRESQL DATABASE (Cloud)                   │
│  URL: ep-flat-mode-ahzpjnk0-pooler.c-3.us-east-1.aws...   │
│                                                              │
│  Tables:                                                     │
│  ├─ User          (user accounts)                          │
│  ├─ ApiKey        (API keys for authentication)            │
│  ├─ Execution     (pipeline executions)                    │
│  ├─ Step          (individual pipeline steps)              │
│  └─ ReasoningJob  (async AI reasoning tasks)               │
│                                                              │
│  ✅ THIS IS WHERE YOUR LOGS ARE STORED PERMANENTLY         │
└─────────────────────────────────────────────────────────────┘
                     ▲
                     │ Read data
                     │
┌─────────────────────────────────────────────────────────────┐
│              X-RAY FRONTEND (Next.js React UI)              │
│                                                              │
│  Pages:                                                      │
│  ├─ /                    (Dashboard - list executions)     │
│  ├─ /execution/:id       (Execution details)               │
│  ├─ /signup              (Create user & API key)           │
│  └─ /api-key             (Manage API keys)                 │
│                                                              │
│  Features:                                                   │
│  - View all your executions                                 │
│  - See step-by-step breakdown                              │
│  - Visualize pipeline flow                                 │
│  - Read AI-generated reasoning                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Complete Data Flow: Demo App Example

### Step-by-Step Flow When You Run `npm run example:basic`

#### 1. **Your Demo App (Client Side)**
```typescript
// Location: demo-app/src/1-basic-example.ts

const executionData = {
  executionId: "basic-demo-1767099499654",
  steps: [
    { name: "data_ingestion", input: {...}, output: {...}, durationMs: 301 },
    { name: "data_validation", input: {...}, output: {...}, durationMs: 201 },
    { name: "data_transformation", input: {...}, output: {...}, durationMs: 402 },
    { name: "data_storage", input: {...}, output: {...}, durationMs: 251 }
  ]
};

// Submit to X-Ray backend
fetch('https://x-ray-library-sdk-...vercel.app/api/logs', {
  method: 'POST',
  headers: {
    'x-api-key': 'xray_07b05c5c66c7c3c...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(executionData)
});
```

#### 2. **X-Ray Backend Receives Request**
```typescript
// Location: x-ray/src/app/api/logs/route.ts

export async function POST(request: NextRequest) {
  // 1. Validate API key
  const apiKey = request.headers.get('x-api-key');
  const userId = await validateApiKey(apiKey);

  if (!userId) {
    return NextResponse.json(
      { error: "Invalid or missing API key" },
      { status: 401 }
    );
  }

  // 2. Parse execution data
  const executionData = await request.json();

  // 3. Save to database
  await saveExecution(executionData, userId);

  // 4. Return success
  return NextResponse.json({
    success: true,
    executionId: executionData.executionId
  });
}
```

#### 3. **Database Storage (Neon PostgreSQL)**
```sql
-- The data gets saved to these tables:

-- 1. Find the user by API key
SELECT "userId" FROM "ApiKey" WHERE "key" = 'xray_07b05c5c66c7c3c...';

-- 2. Create execution record
INSERT INTO "Execution" (
  "id", "executionId", "userId", "projectId",
  "metadata", "finalOutcome", "startedAt", "completedAt"
) VALUES (
  'cuid...', 'basic-demo-1767099499654', 'user_123', 'default',
  '{}', NULL, NOW(), NULL
);

-- 3. Create step records (one for each step)
INSERT INTO "Step" (
  "id", "executionId", "name", "input", "output",
  "error", "durationMs", "reasoning", "createdAt"
) VALUES
  ('step1', 'exec_id', 'data_ingestion', '{"source":"api"}', '{"records":1000}', NULL, 301, NULL, NOW()),
  ('step2', 'exec_id', 'data_validation', '{"records":1000}', '{"valid":980}', NULL, 201, NULL, NOW()),
  ('step3', 'exec_id', 'data_transformation', '{"valid":980}', '{"normalized":980}', NULL, 402, NULL, NOW()),
  ('step4', 'exec_id', 'data_storage', '{"normalized":980}', '{"saved":980}', NULL, 251, NULL, NOW());

-- ✅ YOUR DATA IS NOW PERMANENTLY STORED IN THE DATABASE
```

#### 4. **View in Dashboard (Frontend)**
```typescript
// When you visit: https://x-ray-...vercel.app/execution/basic-demo-1767099499654

// 1. Frontend fetches data from backend
const response = await fetch(`/api/execution/basic-demo-1767099499654`, {
  headers: { 'x-api-key': 'xray_...' }
});

// 2. Backend queries database
const execution = await prisma.execution.findUnique({
  where: { executionId: 'basic-demo-1767099499654' },
  include: { steps: true } // Include all step records
});

// 3. Frontend renders the data
// - Shows execution timeline
// - Displays each step with input/output
// - Shows duration, success/failure
// - Displays AI-generated reasoning (if available)
```

---

## ✅ YES: Demo App Logs Are Saved in Real X-Ray Database

### Proof:

**Test 1 - Verification Test:**
- Execution ID: `verify-test-1767099484813`
- Stored in: Neon PostgreSQL database
- Table: `Execution` (1 row) + `Step` (3 rows)
- View at: https://x-ray-library-sdk-git-main-devdurgesh619s-projects.vercel.app/execution/verify-test-1767099484813

**Test 2 - Basic Example:**
- Execution ID: `basic-demo-1767099499654`
- Stored in: Neon PostgreSQL database
- Table: `Execution` (1 row) + `Step` (4 rows)
- View at: https://x-ray-library-sdk-git-main-devdurgesh619s-projects.vercel.app/execution/basic-demo-1767099499654

### How to Verify:

```bash
# Query the database directly
cd /Users/durgesh/Desktop/projects/equall-collective/x-ray

# Check if execution exists
npx prisma studio
# Navigate to Execution table
# Search for: verify-test-1767099484813 or basic-demo-1767099499654
# You'll see the full execution data stored there
```

---

## 🔍 Key Concepts

### 1. **xray-sdk (npm package)**
- Published at: https://www.npmjs.com/package/xray-sdk
- Purpose: Makes it easy to track pipelines
- Contains: Client-side logging utilities
- Does NOT store data itself - sends to backend

### 2. **X-Ray Backend (Vercel)**
- URL: https://x-ray-library-sdk-git-main-devdurgesh619s-projects.vercel.app
- Purpose: API server for receiving and storing logs
- Technology: Next.js (App Router) + Prisma
- Deployed on: Vercel (serverless)

### 3. **Neon PostgreSQL Database**
- URL: ep-flat-mode-ahzpjnk0-pooler.c-3.us-east-1.aws.neon.tech
- Purpose: Permanent storage for all execution data
- Type: Cloud-hosted PostgreSQL
- All logs are stored here forever (until you delete them)

### 4. **X-Ray Frontend (Dashboard)**
- Part of the same Next.js app
- Purpose: UI to view and analyze logs
- Pages: Dashboard, execution details, user management

---

## 🎯 Use Cases & Data Flow

### Use Case 1: Tracking Your Own Application

```
Your App → xray-sdk → HTTP API → X-Ray Backend → PostgreSQL
                                        ↓
                                  X-Ray Dashboard
```

**Example:**
```typescript
// In your own application
import { submitLogs } from 'custom-wrapper';

async function myPipeline() {
  const execution = {
    executionId: `my-app-${Date.now()}`,
    steps: []
  };

  // Track steps
  execution.steps.push({
    name: 'llm_call',
    input: { prompt: '...' },
    output: { response: '...' },
    durationMs: 1200
  });

  // Submit to X-Ray
  await submitLogs(execution);
}
```

### Use Case 2: Demo Pipeline (Built-in)

```
Dashboard UI → Run Pipeline Button → X-Ray Backend → Execute Demo → PostgreSQL
                                                            ↓
                                                      Return execution ID
```

**Example:**
- Click "Run Pipeline" in dashboard
- Backend executes the competitor selection pipeline
- Saves to database automatically
- Redirects to execution detail page

### Use Case 3: External Application Logging

```
External App → HTTP POST → X-Ray Backend → PostgreSQL
                                   ↓
                             X-Ray Dashboard
```

**Example:** Your demo-app examples

---

## 📊 Data Persistence

### What Gets Stored:

```typescript
// Execution Record
{
  executionId: "unique-id",
  userId: "user-who-owns-this",
  projectId: "default",
  startedAt: "2025-12-30T12:45:00Z",
  completedAt: "2025-12-30T12:45:03Z",
  metadata: { domain: "...", pipeline: "..." },
  finalOutcome: { result: "..." }
}

// Step Records (multiple per execution)
{
  executionId: "unique-id",
  name: "step_name",
  input: { /* JSON data */ },
  output: { /* JSON data */ },
  error: null,
  durationMs: 250,
  reasoning: "AI-generated explanation",
  createdAt: "2025-12-30T12:45:01Z"
}
```

### Storage Location:
- **Production:** Neon PostgreSQL (Cloud)
- **Connection:** Via Prisma ORM
- **Persistence:** Permanent (until manually deleted)
- **Backup:** Managed by Neon

---

## 🔐 Security & Authentication

### API Key Flow:

```
1. User signs up → API key generated (xray_...)
2. API key stored in database (ApiKey table)
3. User includes key in HTTP headers
4. Backend validates key against database
5. If valid → allow access to logs
6. If invalid → return 401 Unauthorized
```

### Authorization:
- Users can only access their own executions
- API key determines user identity
- Database enforces user_id relationships

---

## 🚀 Real-World Example: Complete Flow

Let's trace a complete example from your demo app:

### 1. You Run the Demo
```bash
cd demo-app
npm run example:basic
```

### 2. Demo App Creates Execution Data
```typescript
const executionData = {
  executionId: "basic-demo-1767099499654",
  steps: [/* 4 steps */]
};
```

### 3. Demo App Sends HTTP Request
```
POST https://x-ray-library-sdk-...vercel.app/api/logs
Headers:
  x-api-key: xray_07b05c5c66c7c3c63f4175d90ab4f8989228a5ec0bddc6fc5ea3f27bbe7e33e5
  Content-Type: application/json
Body:
  { executionId: "...", steps: [...] }
```

### 4. X-Ray Backend Validates API Key
```typescript
// Look up API key in database
const apiKey = await prisma.apiKey.findUnique({
  where: { key: 'xray_07b05c5c66c7c3c...' }
});

// Returns: { userId: 'user_kapil', ... }
```

### 5. X-Ray Backend Saves to Database
```typescript
// Create execution record
await prisma.execution.create({
  data: {
    executionId: 'basic-demo-1767099499654',
    userId: 'user_kapil',
    // ... other fields
  }
});

// Create step records (4 steps)
await prisma.step.createMany({
  data: [
    { executionId: '...', name: 'data_ingestion', ... },
    { executionId: '...', name: 'data_validation', ... },
    { executionId: '...', name: 'data_transformation', ... },
    { executionId: '...', name: 'data_storage', ... }
  ]
});
```

### 6. Database Stores Permanently
```
Neon PostgreSQL:
  Table: Execution
    ├─ ID: cuid_12345
    ├─ executionId: basic-demo-1767099499654
    ├─ userId: user_kapil
    └─ ... (metadata, timestamps)

  Table: Step (4 rows)
    ├─ Step 1: data_ingestion (301ms)
    ├─ Step 2: data_validation (201ms)
    ├─ Step 3: data_transformation (402ms)
    └─ Step 4: data_storage (251ms)
```

### 7. You View in Dashboard
```
Visit: https://x-ray-...vercel.app/execution/basic-demo-1767099499654

Dashboard:
  1. Reads from database (via Prisma)
  2. Renders execution timeline
  3. Shows all 4 steps with data
  4. Displays duration, input/output
  5. Shows AI reasoning (if generated)
```

---

## 🎯 Summary: How You Use X-Ray

### For Developers:

1. **Sign Up**
   - Visit dashboard
   - Create account
   - Get API key

2. **Install SDK**
   ```bash
   npm install xray-sdk
   ```

3. **Track Your Pipeline**
   ```typescript
   const execution = {
     executionId: `my-pipeline-${Date.now()}`,
     steps: [/* track your steps */]
   };
   ```

4. **Submit Logs**
   ```typescript
   await fetch(`${API_URL}/api/logs`, {
     method: 'POST',
     headers: { 'x-api-key': YOUR_KEY },
     body: JSON.stringify(execution)
   });
   ```

5. **View in Dashboard**
   - All executions listed on homepage
   - Click to see detailed breakdown
   - Analyze performance and errors

---

## ✅ Confirmation: Yes, Real Database

**Your demo-app examples ARE stored in the real X-Ray database:**

✅ Database: Neon PostgreSQL (production database)
✅ Location: AWS us-east-1 (cloud)
✅ Storage: Permanent (persisted)
✅ Viewable: In the dashboard
✅ Queryable: Via Prisma or SQL

**Proof:** Visit these URLs (they work because data is in database):
- https://x-ray-library-sdk-git-main-devdurgesh619s-projects.vercel.app/execution/verify-test-1767099484813
- https://x-ray-library-sdk-git-main-devdurgesh619s-projects.vercel.app/execution/basic-demo-1767099499654

If the data wasn't in the real database, these pages would show "Not Found" errors.

---

## 🎉 Complete Picture

```
┌──────────────┐
│  Demo App    │  (Your code)
│  or          │
│  Any App     │
└──────┬───────┘
       │ npm install xray-sdk
       │ Track pipeline steps
       │ Submit via HTTP API
       ▼
┌──────────────────┐
│  X-Ray Backend   │  (Next.js on Vercel)
│  - Validate auth │
│  - Process logs  │
│  - Save to DB    │
└──────┬───────────┘
       │ Prisma ORM
       │ SQL queries
       ▼
┌──────────────────┐
│  PostgreSQL DB   │  (Neon Cloud - REAL DATABASE)
│  - User table    │  ✅ YOUR DATA IS HERE
│  - ApiKey table  │  ✅ PERMANENTLY STORED
│  - Execution     │  ✅ QUERYABLE
│  - Step table    │  ✅ VIEWABLE IN DASHBOARD
└──────┬───────────┘
       │ Read data
       ▼
┌──────────────────┐
│  X-Ray Frontend  │  (React UI)
│  - Dashboard     │
│  - Execution UI  │
│  - Analytics     │
└──────────────────┘
```

**Every log you submit goes through this entire flow and ends up permanently stored in the Neon PostgreSQL database.**

---

**Created:** December 30, 2025
**Purpose:** Complete architectural overview of X-Ray observability platform
