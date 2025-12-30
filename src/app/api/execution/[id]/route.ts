import { NextResponse } from "next/server"
import { getExecutionById } from "@/lib/storage"
import { getUserIdFromRequest, unauthorizedResponse } from "@/lib/authMiddleware"

type Props = {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: Props) {
  // Extract and validate userId from API key
  const userId = await getUserIdFromRequest(request)

  if (!userId) {
    return unauthorizedResponse()
  }

  try {
    const { id } = await params

    // Pass userId for authorization check
    const execution = await getExecutionById(id, userId)

    if (!execution) {
      // Could mean not found OR unauthorized - storage returns undefined for both
      return NextResponse.json(
        { error: "Execution not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(execution)
  } catch (error: any) {
    console.error('[get-execution] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve execution' },
      { status: 500 }
    )
  }
}
