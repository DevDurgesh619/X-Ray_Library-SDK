/**
 * Get or create an API key for testing
 */

import { PrismaClient } from '@prisma/client';
import { createUser } from '../src/lib/auth';

const prisma = new PrismaClient();

async function getOrCreateApiKey() {
  console.log('🔍 Checking for existing API keys...\n');

  // Check for existing API keys
  const existingKeys = await prisma.apiKey.findMany({
    take: 5,
    include: {
      user: {
        select: {
          email: true,
          name: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  if (existingKeys.length > 0) {
    console.log(`Found ${existingKeys.length} existing API key(s):\n`);
    existingKeys.forEach((key, index) => {
      console.log(`${index + 1}. Key: ${key.key.substring(0, 20)}...`);
      console.log(`   User: ${key.user.email} (${key.user.name || 'N/A'})`);
      console.log(`   Created: ${key.createdAt}`);
      console.log('');
    });

    // Use the first key
    const testKey = existingKeys[0];
    console.log('✅ Using existing API key for tests:');
    console.log(`   ${testKey.key}`);
    console.log('');
    return testKey.key;
  } else {
    console.log('No existing API keys found. Creating new test user...\n');

    // Create a new test user
    const testEmail = `test-${Date.now()}@example.com`;
    const testName = 'E2E Test User';

    console.log(`Creating user: ${testEmail}`);
    const result = await createUser(testEmail, testName);

    console.log('');
    console.log('✅ Created new API key for tests:');
    console.log(`   User: ${result.user.email}`);
    console.log(`   API Key: ${result.apiKey.key}`);
    console.log('');

    return result.apiKey.key;
  }
}

getOrCreateApiKey()
  .then(apiKey => {
    console.log('---');
    console.log('Export this for testing:');
    console.log(`export XRAY_TEST_API_KEY="${apiKey}"`);
    console.log('');
    prisma.$disconnect();
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error:', error);
    prisma.$disconnect();
    process.exit(1);
  });
