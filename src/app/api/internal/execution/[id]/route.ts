import { NextResponse } from "next/server"
import { getExecutionById } from "@/lib/storage"

type Props = {
  params: Promise<{ id: string }>
}

/**
 * Internal API endpoint for dashboard to fetch execution without authentication
 * This is used by the frontend polling mechanism to check for reasoning updates
 */
export async function GET(request: Request, { params }: Props) {
  try {
    const { id } = await params
    const execution = await getExecutionById(id)

    if (!execution) {
      return NextResponse.json(
        { error: 'Execution not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(execution)
  } catch (error: any) {
    console.error('[Internal API] Error fetching execution:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
