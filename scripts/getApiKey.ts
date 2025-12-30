import { prisma } from '../src/lib/prisma'

async function main() {
  const apiKey = await prisma.apiKey.findFirst({
    select: { key: true, user: { select: { email: true } } }
  })

  if (apiKey) {
    console.log('Email:', apiKey.user.email)
    console.log('API Key:', apiKey.key)
  } else {
    console.log('No API keys found. Please visit http://localhost:3000/signup to create one.')
  }
}

main().finally(() => prisma.$disconnect())
