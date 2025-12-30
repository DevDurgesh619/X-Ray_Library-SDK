# Database Setup Instructions

## Step 1: Create Neon PostgreSQL Database

1. Go to [Neon Console](https://console.neon.tech)
2. Sign in or create an account
3. Click "Create Project"
4. Choose a project name (e.g., "xray-executions")
5. Select a region closest to you
6. Click "Create Project"

## Step 2: Get Your Connection String

1. In your Neon project dashboard, click on "Connection Details"
2. Copy the connection string (it looks like):
   ```
   postgresql://username:password@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

## Step 3: Configure Environment Variables

1. Open `.env.local` in your project root
2. Replace the placeholder DATABASE_URL with your actual connection string:
   ```bash
   DATABASE_URL="postgresql://username:password@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require"
   ```

## Step 4: Run Database Migrations

Run the following commands in your terminal:

```bash
# Generate Prisma client
npx prisma generate

# Create database tables
npx prisma migrate dev --name init

# Verify migration succeeded
npx prisma studio
```

This will:
- Generate the Prisma client with TypeScript types
- Create the `Execution`, `Step`, and `ReasoningJob` tables in your database
- Open Prisma Studio (optional) to visually inspect your database

## Step 5: Migrate Existing JSON Data (Optional)

If you have existing executions in `data/executions.json`, you can migrate them to the database:

```bash
npm run migrate:json
```

This will read all executions from the JSON file and insert them into the database.

## Step 6: Test the Setup

Run your Next.js development server:

```bash
npm run dev
```

Then test by running your pipeline:

```bash
npm run movie:pipeline
```

Check that:
1. Execution appears in the UI at http://localhost:3000
2. Steps are visible with input/output
3. Reasoning auto-generates and displays

## Troubleshooting

### Error: "PrismaClient is unable to run in this browser environment"

**Solution**: Make sure you're not importing Prisma in client components. Prisma should only be used in:
- Server components
- API routes
- Server-side functions

### Error: "Can't reach database server"

**Solution**:
1. Check your DATABASE_URL is correct
2. Ensure your internet connection is active
3. Verify Neon project is not paused (free tier pauses after inactivity)

### Error: "Invalid connection string"

**Solution**: Make sure your connection string:
1. Starts with `postgresql://`
2. Includes `?sslmode=require` at the end
3. Has no extra spaces or quotes

### Migration fails with "database does not exist"

**Solution**: Neon automatically creates a default database called `neondb`. Make sure your connection string points to it.

## Database Schema

The migration creates 3 tables:

### Execution
- `id` (cuid, primary key)
- `executionId` (unique, user-facing ID)
- `projectId` (for multi-tenancy)
- `metadata` (JSON)
- `finalOutcome` (JSON)
- `startedAt` (timestamp)
- `completedAt` (timestamp, nullable)

### Step
- `id` (cuid, primary key)
- `executionId` (foreign key → Execution)
- `name` (step name)
- `input` (JSON)
- `output` (JSON)
- `error` (text, nullable)
- `durationMs` (integer, nullable)
- `reasoning` (text, nullable)
- `createdAt` (timestamp)

### ReasoningJob
- `id` (cuid, primary key)
- `executionId` (foreign key → Execution)
- `stepName` (step name)
- `status` (pending/processing/completed/failed)
- `reasoning` (text, nullable)
- `error` (text, nullable)
- `attempts` (integer, default 0)
- `createdAt` (timestamp)
- `completedAt` (timestamp, nullable)

## Next Steps

After successful database setup:
1. ✅ Database is configured and running
2. ✅ Storage layer uses Prisma instead of JSON files
3. ✅ All API routes updated for async operations
4. ✅ No more race conditions (database handles locking)

You can now:
- Deploy to Vercel/Railway with DATABASE_URL environment variable
- Scale to millions of executions
- Query executions by date, project, or status
- Add user authentication and multi-tenancy
