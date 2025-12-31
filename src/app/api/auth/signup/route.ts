import { NextResponse } from 'next/server'
import { createUser } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const { email, name } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const { user, apiKey } = await createUser(email, name || undefined)

    return NextResponse.json({
      success: true,
      userId: user.id,
      apiKey
    })
  } catch (error: any) {
    console.error('[signup] Error:', error)

    if (error.message === 'Email already exists') {
      return NextResponse.json(
        { error: 'This email is already registered' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    )
  }
}
