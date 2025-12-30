import { validateApiKey } from './auth'
import { NextResponse } from 'next/server'

/**
 * Extract and validate userId from request headers
 * Returns userId or null if invalid
 */
export async function getUserIdFromRequest(request: Request): Promise<string | null> {
  // Check multiple header formats
  const apiKey =
    request.headers.get('x-api-key') ||
    request.headers.get('authorization')?.replace('Bearer ', '')

  if (!apiKey) {
    return null
  }

  return await validateApiKey(apiKey)
}

/**
 * Helper to return 401 response
 */
export function unauthorizedResponse(message = 'Invalid or missing API key') {
  return NextResponse.json(
    { error: message },
    { status: 401 }
  )
}

/**
 * Helper to return 403 response
 */
export function forbiddenResponse(message = 'Access denied') {
  return NextResponse.json(
    { error: message },
    { status: 403 }
  )
}
