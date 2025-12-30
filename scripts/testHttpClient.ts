import { XRay, XRayHttpClient } from '../src/xRay'

async function test() {
  const apiKey = process.env.XRAY_API_KEY

  if (!apiKey) {
    console.error('Error: XRAY_API_KEY environment variable is required')
    console.log('Usage: XRAY_API_KEY="your-key" npx tsx scripts/testHttpClient.ts')
    process.exit(1)
  }

  const client = new XRayHttpClient({
    apiKey: apiKey,
    serverUrl: 'http://localhost:3000'
  })

  const executionId = 'http-test-' + Date.now()
  console.log('Creating execution:', executionId)

  const xray = new XRay(executionId, {
    pipeline: 'http-client-test'
  })

  // Step 1
  xray.startStep('step1', { input: 'test data' })
  await new Promise(resolve => setTimeout(resolve, 100)) // Simulate work
  await xray.endStep('step1', { output: 'success' })

  // Step 2
  xray.startStep('step2', { input: 'processing' })
  await new Promise(resolve => setTimeout(resolve, 100)) // Simulate work
  await xray.endStep('step2', { output: 'completed' })

  const execution = xray.end({ result: 'complete', status: 'success' })

  console.log('Sending execution to server...')
  const response = await client.sendExecution(execution)
  console.log('Response:', response)

  console.log('\nView your execution at: http://localhost:3000/execution/' + executionId)
}

test().catch(console.error)
