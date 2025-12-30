import { createUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default function SignupPage() {
  async function handleSignup(formData: FormData) {
    'use server'

    const email = formData.get('email') as string
    const name = formData.get('name') as string

    if (!email) {
      return
    }

    try {
      const { user, apiKey } = await createUser(email, name || undefined)
      redirect(`/api-key?key=${apiKey}`)
    } catch (error) {
      console.error('Signup error:', error)
      // In production, handle this properly with error states
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-6">Create Account</h1>

        <form action={handleSignup}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              name="email"
              required
              className="w-full px-3 py-2 border rounded"
              placeholder="you@company.com"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Name (optional)</label>
            <input
              type="text"
              name="name"
              className="w-full px-3 py-2 border rounded"
              placeholder="Your Name"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            Create Account
          </button>
        </form>
      </div>
    </div>
  )
}
