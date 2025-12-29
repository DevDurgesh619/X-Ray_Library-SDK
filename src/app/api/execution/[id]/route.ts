import { NextResponse } from "next/server"
import { getExecutionById } from "@/lib/storage"

type Props = {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: Props) {
  const { id } = await params
  const execution = getExecutionById(id)

  if (!execution) {
    return NextResponse.json({ error: "Execution not found" }, { status: 404 })
  }

  return NextResponse.json(execution)
}
