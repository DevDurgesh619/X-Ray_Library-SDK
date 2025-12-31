/**
 * End-to-End Production Test for X-Ray
 * Production URL: https://x-ray-library-sdk-git-main-devdurgesh619s-projects.vercel.app
 *
 * Run with: tsx tests/e2e-production-test.ts
 */

const PROD_URL = 'https://x-ray-library-sdk-git-main-devdurgesh619s-projects.vercel.app';

// Get API key from environment or command line
const API_KEY = process.env.XRAY_TEST_API_KEY || process.argv[2];

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  data?: any;
}

const results: TestResult[] = [];

// Helper functions
function log(message: string, type: 'info' | 'success' | 'error' | 'test' = 'info') {
  const colors = {
    info: '\x1b[33m',    // Yellow
    success: '\x1b[32m', // Green
    error: '\x1b[31m',   // Red
    test: '\x1b[34m'     // Blue
  };
  const icons = {
    info: '[i]',
    success: '[✓]',
    error: '[✗]',
    test: '[TEST]'
  };
  console.log(`${colors[type]}${icons[type]}\x1b[0m ${message}`);
}

function addResult(name: string, passed: boolean, message: string, data?: any) {
  results.push({ name, passed, message, data });
  if (passed) {
    log(`${name}: ${message}`, 'success');
  } else {
    log(`${name}: ${message}`, 'error');
  }
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test functions
async function test1_CheckProductionSite() {
  log('Test 1: Checking if production site is accessible...', 'test');
  try {
    const response = await fetch(PROD_URL);
    const passed = response.ok;
    addResult(
      'Production Site Accessibility',
      passed,
      passed ? `Site accessible (HTTP ${response.status})` : `Site returned HTTP ${response.status}`
    );
    return passed;
  } catch (error) {
    addResult('Production Site Accessibility', false, `Error: ${error}`);
    return false;
  }
}

async function test2_CheckReasoningStats() {
  log('Test 2: Testing public reasoning stats endpoint...', 'test');
  try {
    const response = await fetch(`${PROD_URL}/api/reasoning/stats`);
    const data = await response.json();
    const passed = response.ok && data.queue !== undefined;
    addResult(
      'Reasoning Stats Endpoint',
      passed,
      passed ? 'Endpoint working correctly' : 'Endpoint failed',
      data
    );
    return passed;
  } catch (error) {
    addResult('Reasoning Stats Endpoint', false, `Error: ${error}`);
    return false;
  }
}

async function test3_AuthenticationRequired() {
  log('Test 3: Testing authentication (should fail without API key)...', 'test');
  try {
    const response = await fetch(`${PROD_URL}/api/run-pipeline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const passed = response.status === 401;
    addResult(
      'Authentication Required',
      passed,
      passed ? 'Correctly blocks unauthenticated requests (HTTP 401)' : `Expected HTTP 401, got ${response.status}`
    );
    return passed;
  } catch (error) {
    addResult('Authentication Required', false, `Error: ${error}`);
    return false;
  }
}

async function test4_ValidateApiKey() {
  log('Test 4: Validating API key format...', 'test');
  if (!API_KEY) {
    addResult('API Key Validation', false, 'No API key provided. Set XRAY_TEST_API_KEY env var or pass as argument');
    return false;
  }
  const passed = API_KEY.startsWith('xray_');
  addResult(
    'API Key Validation',
    passed,
    passed ? `API key format valid: ${API_KEY.substring(0, 15)}...` : 'Invalid API key format'
  );
  return passed;
}

async function test5_RunPipeline() {
  log('Test 5: Running competitor selection pipeline...', 'test');
  try {
    const response = await fetch(`${PROD_URL}/api/run-pipeline`, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY!,
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    const passed = response.ok && data.executionId;
    addResult(
      'Pipeline Execution',
      passed,
      passed ? `Pipeline executed: ${data.executionId}` : 'Pipeline execution failed',
      data
    );
    return passed ? data.executionId : null;
  } catch (error) {
    addResult('Pipeline Execution', false, `Error: ${error}`);
    return null;
  }
}

async function test6_RetrieveExecution(executionId: string) {
  log('Test 6: Retrieving execution details...', 'test');
  await sleep(2000); // Wait for execution to complete

  try {
    const response = await fetch(`${PROD_URL}/api/execution/${executionId}`, {
      headers: { 'x-api-key': API_KEY! }
    });
    const data = await response.json();
    const passed = response.ok && data.executionId;

    if (passed) {
      const stepsCount = data.steps?.length || 0;
      const completed = !!data.completedAt;
      addResult(
        'Execution Retrieval',
        true,
        `Retrieved execution with ${stepsCount} steps${completed ? ' (completed)' : ' (running)'}`,
        { stepsCount, completed, hasReasoning: data.steps?.some((s: any) => s.reasoning) }
      );
    } else {
      addResult('Execution Retrieval', false, 'Failed to retrieve execution', data);
    }
    return passed ? data : null;
  } catch (error) {
    addResult('Execution Retrieval', false, `Error: ${error}`);
    return null;
  }
}

async function test7_RunMoviePipeline() {
  log('Test 7: Running movie recommendation pipeline...', 'test');
  try {
    const response = await fetch(`${PROD_URL}/api/run-movie-pipeline`, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY!,
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    const passed = response.ok && data.executionId;
    addResult(
      'Movie Pipeline Execution',
      passed,
      passed ? `Movie pipeline executed: ${data.executionId}` : 'Movie pipeline failed',
      data
    );
    return passed ? data.executionId : null;
  } catch (error) {
    addResult('Movie Pipeline Execution', false, `Error: ${error}`);
    return null;
  }
}

async function test8_TriggerReasoning(executionId: string) {
  log('Test 8: Triggering reasoning generation...', 'test');
  await sleep(1000);

  try {
    const response = await fetch(`${PROD_URL}/api/reasoning/process`, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ executionId })
    });
    const data = await response.json();
    const passed = response.ok && data.success;
    addResult(
      'Reasoning Generation',
      passed,
      passed ? 'Reasoning triggered successfully' : 'Failed to trigger reasoning',
      data
    );
    return passed;
  } catch (error) {
    addResult('Reasoning Generation', false, `Error: ${error}`);
    return false;
  }
}

async function test9_VerifyReasoningCompleted(executionId: string) {
  log('Test 9: Verifying reasoning completion...', 'test');
  await sleep(3000); // Wait for reasoning to process

  try {
    const response = await fetch(`${PROD_URL}/api/execution/${executionId}`, {
      headers: { 'x-api-key': API_KEY! }
    });
    const data = await response.json();
    const stepsWithReasoning = data.steps?.filter((s: any) => s.reasoning)?.length || 0;
    const totalSteps = data.steps?.length || 0;
    const passed = stepsWithReasoning > 0;

    addResult(
      'Reasoning Completion',
      passed,
      passed
        ? `${stepsWithReasoning}/${totalSteps} steps have reasoning`
        : 'No reasoning found yet (may still be processing)',
      { stepsWithReasoning, totalSteps }
    );
    return passed;
  } catch (error) {
    addResult('Reasoning Completion', false, `Error: ${error}`);
    return false;
  }
}

async function test10_TestAuthorization() {
  log('Test 10: Testing authorization (access control)...', 'test');
  try {
    const fakeId = 'fake-execution-id-12345';
    const response = await fetch(`${PROD_URL}/api/execution/${fakeId}`, {
      headers: { 'x-api-key': API_KEY! }
    });
    const passed = response.status === 404 || response.status === 403;
    addResult(
      'Authorization Control',
      passed,
      passed
        ? `Correctly blocks unauthorized access (HTTP ${response.status})`
        : `Expected HTTP 404/403, got ${response.status}`
    );
    return passed;
  } catch (error) {
    addResult('Authorization Control', false, `Error: ${error}`);
    return false;
  }
}

async function test11_InvalidApiKey() {
  log('Test 11: Testing with invalid API key...', 'test');
  try {
    const response = await fetch(`${PROD_URL}/api/run-pipeline`, {
      method: 'POST',
      headers: {
        'x-api-key': 'xray_invalid_key_12345',
        'Content-Type': 'application/json'
      }
    });
    const passed = response.status === 401;
    addResult(
      'Invalid API Key Rejection',
      passed,
      passed ? 'Invalid key correctly rejected (HTTP 401)' : `Expected HTTP 401, got ${response.status}`
    );
    return passed;
  } catch (error) {
    addResult('Invalid API Key Rejection', false, `Error: ${error}`);
    return false;
  }
}

async function test12_SubmitCustomLogs() {
  log('Test 12: Testing custom log submission...', 'test');
  try {
    const customExecution = {
      executionId: `test-custom-${Date.now()}`,
      steps: [
        {
          name: 'test_step',
          input: { message: 'test input' },
          output: { result: 'test output' },
          durationMs: 100
        }
      ]
    };

    const response = await fetch(`${PROD_URL}/api/logs`, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(customExecution)
    });
    const data = await response.json();
    const passed = response.ok && data.success;
    addResult(
      'Custom Log Submission',
      passed,
      passed ? `Custom logs submitted: ${data.executionId}` : 'Failed to submit logs',
      data
    );
    return passed ? data.executionId : null;
  } catch (error) {
    addResult('Custom Log Submission', false, `Error: ${error}`);
    return null;
  }
}

// Main test runner
async function runAllTests() {
  console.log('==========================================');
  console.log('X-Ray Production End-to-End Test Suite');
  console.log('==========================================');
  console.log(`Production URL: ${PROD_URL}`);
  console.log(`API Key: ${API_KEY ? API_KEY.substring(0, 15) + '...' : 'NOT PROVIDED'}`);
  console.log('');

  let executionId: string | null = null;
  let movieExecutionId: string | null = null;
  let customExecutionId: string | null = null;

  // Run tests sequentially
  await test1_CheckProductionSite();
  await test2_CheckReasoningStats();
  await test3_AuthenticationRequired();

  const hasValidKey = await test4_ValidateApiKey();

  if (hasValidKey) {
    executionId = await test5_RunPipeline();

    if (executionId) {
      await test6_RetrieveExecution(executionId);
      await test8_TriggerReasoning(executionId);
      await test9_VerifyReasoningCompleted(executionId);
    }

    movieExecutionId = await test7_RunMoviePipeline();
    await test10_TestAuthorization();
    customExecutionId = await test12_SubmitCustomLogs();
  } else {
    log('Skipping authenticated tests - no valid API key provided', 'info');
    log('To run all tests, provide API key: XRAY_TEST_API_KEY=xray_... tsx tests/e2e-production-test.ts', 'info');
  }

  await test11_InvalidApiKey();

  // Print summary
  console.log('');
  console.log('==========================================');
  console.log('Test Summary');
  console.log('==========================================');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  console.log(`Total Tests: ${total}`);
  log(`Passed: ${passed}`, 'success');
  if (failed > 0) {
    log(`Failed: ${failed}`, 'error');
  }
  console.log('');

  // Print execution links
  if (executionId) {
    log(`View Execution: ${PROD_URL}/execution/${executionId}`, 'info');
  }
  if (movieExecutionId) {
    log(`View Movie Execution: ${PROD_URL}/execution/${movieExecutionId}`, 'info');
  }
  if (customExecutionId) {
    log(`View Custom Execution: ${PROD_URL}/execution/${customExecutionId}`, 'info');
  }
  console.log('');

  // Print detailed results
  console.log('Detailed Results:');
  console.log('------------------------------------------');
  results.forEach((result, index) => {
    const icon = result.passed ? '✓' : '✗';
    const color = result.passed ? '\x1b[32m' : '\x1b[31m';
    console.log(`${index + 1}. ${color}${icon}\x1b[0m ${result.name}`);
    console.log(`   ${result.message}`);
    if (result.data && Object.keys(result.data).length > 0) {
      console.log(`   Data: ${JSON.stringify(result.data, null, 2).split('\n').join('\n   ')}`);
    }
    console.log('');
  });

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  log(`Fatal error: ${error}`, 'error');
  process.exit(1);
});
