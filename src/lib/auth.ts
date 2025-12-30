import { prisma } from './prisma'
import { randomBytes } from 'crypto'

/**
 * Validate API key and return userId
 * Returns null if invalid
 */
export async function validateApiKey(apiKey: string): Promise<string | null> {
  if (!apiKey || !apiKey.startsWith('xray_')) {
    return null
  }

  const keyRecord = await prisma.apiKey.findUnique({
    where: { key: apiKey },
    select: { userId: true }
  })

  if (!keyRecord) {
    return null
  }

  // Update last used timestamp (async, don't await)
  prisma.apiKey.update({
    where: { key: apiKey },
    data: { lastUsedAt: new Date() }
  }).catch(() => {}) // Ignore failures

  return keyRecord.userId
}

/**
 * Create new user with API key
 */
export async function createUser(email: string, name?: string) {
  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { email }
  })

  if (existingUser) {
    throw new Error('Email already exists')
  }

  const user = await prisma.user.create({
    data: { email, name }
  })

  const apiKey = 'xray_' + randomBytes(32).toString('hex')

  await prisma.apiKey.create({
    data: {
      key: apiKey,
      userId: user.id,
      name: 'Default Key'
    }
  })

  return { user, apiKey }
}

/**
 * Get user's API keys
 */
export async function getUserApiKeys(userId: string) {
  return prisma.apiKey.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  })
}
