-- RemoveDeveloperOpenAiKey
-- Security: Remove developer OpenAI key storage to prevent key exposure

-- Step 1: Remove the developerOpenAiKey column from Execution table
ALTER TABLE "Execution" DROP COLUMN IF EXISTS "developerOpenAiKey";

-- Migration is reversible but NOT recommended for security reasons
-- To rollback (NOT RECOMMENDED):
-- ALTER TABLE "Execution" ADD COLUMN "developerOpenAiKey" TEXT;
