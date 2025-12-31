import Link from 'next/link'
import { CopyButton } from './components/CopyButton'

export default async function ApiKeyPage({
  searchParams
}: {
  searchParams: Promise<{ key?: string; email?: string }> | { key?: string; email?: string }
}) {
  // Handle both Promise and non-Promise searchParams (Next.js 14+ compatibility)
  const params = searchParams instanceof Promise ? await searchParams : searchParams
  const apiKeyParam = params.key
  const emailParam = params.email

  // If key passed via URL, show it directly (post-signup)
  if (apiKeyParam) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-2xl w-full bg-white p-8 rounded-lg shadow">
          <h1 className="text-2xl font-bold mb-4">✅ Account Created!</h1>

          <div className="bg-green-50 border border-green-200 p-4 rounded mb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium">Your API Key</div>
              <CopyButton text={apiKeyParam} />
            </div>
            <code className="text-sm bg-white px-3 py-2 rounded border block break-all font-mono">
              {apiKeyParam}
            </code>
            <div className="text-xs text-gray-600 mt-2">
              ⚠️ Save this key - it won't be shown again
            </div>
          </div>

          {emailParam && (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded mb-6">
              <div className="text-sm font-medium mb-2">📧 Your Account Email</div>
              <div className="text-sm">{emailParam}</div>
              <div className="text-xs text-gray-600 mt-2">
                Use this email if you need to access your keys later
              </div>
            </div>
          )}

          <div className="bg-gray-50 p-4 rounded mb-6">
            <div className="text-sm font-medium mb-2">Usage Example</div>
            <pre className="text-xs bg-white p-3 rounded border overflow-x-auto">
{`// .env file
XRAY_API_URL="https://x-ray-library-sdk-git-main-devdurgesh619s-projects.vercel.app"
XRAY_API_KEY="${apiKeyParam}"

// Your pipeline code
import { XRay } from 'xray-sdk'
import { createXRayClient } from './lib/xrayClient'

const xray = new XRay('exec-123', { pipeline: 'my-pipeline' })
xray.startStep('process', { input: 'data' })
xray.endStep('process', { output: 'result' })

const execution = xray.end({ status: 'success' })
await createXRayClient().saveExecution(execution)`}
            </pre>
          </div>

          <div className="flex gap-4">
            <Link
              href="/"
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // No authentication - show message to create account or contact admin
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-4">API Keys</h1>

        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded mb-6">
          <div className="text-sm font-medium mb-2">🔒 Secure Access</div>
          <p className="text-sm text-gray-700">
            For security reasons, API keys are only shown once during account creation.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <h2 className="font-medium mb-2">Don't have an account?</h2>
            <Link
              href="/signup"
              className="inline-block w-full text-center bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
            >
              Create Account
            </Link>
          </div>

          <div>
            <h2 className="font-medium mb-2">Lost your API key?</h2>
            <p className="text-sm text-gray-600 mb-2">
              API keys are shown only once during account creation for security.
              If you've lost your key, please contact support or create a new account.
            </p>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t">
          <Link href="/" className="text-blue-600 hover:underline text-sm">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
