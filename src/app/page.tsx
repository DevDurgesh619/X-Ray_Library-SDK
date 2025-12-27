import Link from "next/link"
import { loadExecutions } from "@/lib/storage"

export default function Home() {
  const executions = loadExecutions()

  return (
    <main style={{ padding: 20 }}>
      <h1>X-Ray Executions</h1>

      {executions.map(exec => (
        <div key={exec.executionId}>
          <Link href={`/execution/${exec.executionId}`}>
            {exec.executionId}
          </Link>
        </div>
      ))}
    </main>
  )
}
