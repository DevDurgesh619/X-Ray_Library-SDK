import Link from "next/link"
import { getExecutions } from "@/lib/storage"

export default function MovieDashboard() {
  const executions = getExecutions().filter(
    e => e.metadata?.domain === "movie-recommendation"
  )

  return (
    <main style={{ padding: 24 }}>
      <h1>🎬 Movie Recommendation Executions</h1>

      {executions.length === 0 && (
        <p>No movie executions found</p>
      )}

      <ul>
        {executions.map(exec => (
          <li key={exec.executionId}>
            <Link href={`/execution/${exec.executionId}`}>
              {exec.executionId}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
