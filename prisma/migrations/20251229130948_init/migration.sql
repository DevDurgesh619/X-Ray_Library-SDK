-- CreateTable
CREATE TABLE "Execution" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL DEFAULT 'default',
    "metadata" JSONB,
    "finalOutcome" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Execution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Step" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "input" JSONB,
    "output" JSONB,
    "error" TEXT,
    "durationMs" INTEGER,
    "reasoning" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Step_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReasoningJob" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "stepName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reasoning" TEXT,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ReasoningJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Execution_executionId_key" ON "Execution"("executionId");

-- CreateIndex
CREATE INDEX "Execution_projectId_idx" ON "Execution"("projectId");

-- CreateIndex
CREATE INDEX "Execution_executionId_idx" ON "Execution"("executionId");

-- CreateIndex
CREATE INDEX "Execution_startedAt_idx" ON "Execution"("startedAt");

-- CreateIndex
CREATE INDEX "Step_executionId_idx" ON "Step"("executionId");

-- CreateIndex
CREATE INDEX "Step_name_idx" ON "Step"("name");

-- CreateIndex
CREATE INDEX "ReasoningJob_status_idx" ON "ReasoningJob"("status");

-- CreateIndex
CREATE INDEX "ReasoningJob_executionId_stepName_idx" ON "ReasoningJob"("executionId", "stepName");

-- CreateIndex
CREATE UNIQUE INDEX "ReasoningJob_executionId_stepName_key" ON "ReasoningJob"("executionId", "stepName");

-- AddForeignKey
ALTER TABLE "Step" ADD CONSTRAINT "Step_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "Execution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReasoningJob" ADD CONSTRAINT "ReasoningJob_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "Execution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
