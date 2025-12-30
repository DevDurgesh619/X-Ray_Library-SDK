# X-Ray Library Usage

## Installation

Copy the `src/xRay/` folder to your project:

```bash
cp -r src/xRay/ /your-project/lib/xray/
```

## Quick Start

### 1. Get Your API Key

Visit your X-Ray server's signup page to create an account and get your API key.

### 2. Basic Usage

```typescript
import { XRay, XRayHttpClient } from './lib/xray'

// Initialize HTTP client
const client = new XRayHttpClient({
  apiKey: 'xray_your_key_here',
  serverUrl: 'https://your-xray-server.com'
})

// Create execution
const xray = new XRay('exec-' + Date.now(), {
  pipeline: 'my-pipeline-v1'
})

// Track steps
xray.startStep('step1', { input: 'data' })
const result = await doWork()
await xray.endStep('step1', { output: result })

// Complete and send
const execution = xray.end({ success: true })
await client.sendExecution(execution)
```

### 3. Error Handling

```typescript
try {
  await xray.endStep('step1', { output: result })
} catch (error) {
  xray.errorStep('step1', error as Error)
}
```

## API Reference

### XRay Class

**Constructor**
```typescript
new XRay(executionId: string, metadata?: Record<string, any>)
```

**Methods**
- `startStep(name, input, metadata?)` - Begin tracking a step
- `endStep(name, output)` - Complete step successfully (async)
- `errorStep(name, error)` - Mark step as failed (async)
- `end(finalOutcome)` - Complete execution and return data

### XRayHttpClient

**Constructor**
```typescript
new XRayHttpClient({ apiKey, serverUrl })
```

**Methods**
- `sendExecution(execution)` - Send execution to server (async)

## Advanced Usage

### Custom Metadata

```typescript
xray.startStep('search', input, {
  provider: 'elasticsearch',
  index: 'products'
})
```

### Step Evaluations

```typescript
await xray.endStep('filter', {
  candidates: filtered,
  evaluations: products.map(p => ({
    id: p.id,
    passed: p.rating >= 4.0,
    metrics: { rating: p.rating, reviews: p.reviews }
  }))
})
```

## Environment Variables

For server configuration (not needed by customers):

```bash
XRAY_AUTO_REASONING=false          # Enable auto-reasoning
XRAY_REASONING_CONCURRENCY=3       # Parallel LLM calls
XRAY_REASONING_MAX_RETRIES=4       # Retry attempts
```
