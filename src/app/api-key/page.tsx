import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export default async function ApiKeyPage({
  searchParams
}: {
  searchParams: { key?: string }
}) {
  const apiKeyParam = searchParams.key

  // If key passed via URL, show it directly (post-signup)
  if (apiKeyParam) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-2xl w-full bg-white p-8 rounded-lg shadow">
          <h1 className="text-2xl font-bold mb-4">✅ Account Created!</h1>

          <div className="bg-green-50 border border-green-200 p-4 rounded mb-6">
            <div className="text-sm font-medium mb-2">Your API Key</div>
            <code className="text-sm bg-white px-3 py-2 rounded border block break-all font-mono">
              {apiKeyParam}
            </code>
            <div className="text-xs text-gray-600 mt-2">
              ⚠️ Save this key - it won't be shown again
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded mb-6">
            <div className="text-sm font-medium mb-2">Usage Example</div>
            <pre className="text-xs bg-white p-3 rounded border overflow-x-auto">
{`import XRay from '@xray/sdk'

XRay.init({
  apiKey: '${apiKeyParam}',
  serverUrl: 'http://localhost:3000'
})

// Start logging
const xray = new XRay('exec-123')
xray.logStep({ step: 'test', input: {...}, output: {...} })
xray.end({ success: true })`}
            </pre>
          </div>

          <Link
            href="/"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            View Dashboard
          </Link>
        </div>
      </div>
    )
  }

  // Fallback: show all users (for development/debugging)
  const users = await prisma.user.findMany({
    include: { apiKeys: true },
    orderBy: { createdAt: 'desc' },
    take: 10
  })

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">API Keys</h1>
        <Link href="/" className="text-blue-600 hover:underline">
          ← Back to Dashboard
        </Link>
      </div>

      {users.length === 0 && (
        <div className="bg-white border rounded p-8 text-center">
          <p className="text-gray-500 mb-4">No users yet</p>
          <Link
            href="/signup"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            Create Account
          </Link>
        </div>
      )}

      {users.map((user) => (
        <div key={user.id} className="bg-white border rounded p-4 mb-4">
          <div className="font-medium text-lg">{user.name || user.email}</div>
          <div className="text-sm text-gray-600 mb-3">{user.email}</div>

          {user.apiKeys.map((key) => (
            <div key={key.id} className="bg-gray-50 p-3 rounded">
              <div className="text-xs text-gray-500 mb-1">
                {key.name || 'API Key'}
              </div>
              <code className="text-xs font-mono break-all">{key.key}</code>
              <div className="text-xs text-gray-500 mt-2">
                Created: {key.createdAt.toLocaleDateString()}
                {key.lastUsedAt && ` • Last used: ${key.lastUsedAt.toLocaleDateString()}`}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
