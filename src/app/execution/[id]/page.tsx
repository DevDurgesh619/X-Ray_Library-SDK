// src/app/execution/[id]/page.tsx
export const runtime = "nodejs"

import { getExecutionById } from "@/lib/storage"

export default async function ExecutionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const execution = getExecutionById(id)

  if (!execution) {
    return <div style={{ padding: 20 }}>Execution not found</div>
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Execution</h1>
      <p><strong>ID:</strong> {execution.executionId}</p>
      <p><strong>Started:</strong> {execution.startedAt}</p>
      <p><strong>Ended:</strong> {execution.endedAt}</p>

      <hr />

      <h2>Steps</h2>

      {execution.steps.map((step, index) => {
        const hasError = Boolean(step.error)

        return (
          <div
            key={index}
            style={{
              border: "1px solid #ddd",
              borderLeft: hasError ? "5px solid red" : "5px solid green",
              padding: 12,
              marginBottom: 12,
              borderRadius: 4,
              background: "#fafafa",
            }}
          >
            <h3>{step.name}</h3>

            {/* Timing */}
            {step.durationMs !== undefined && (
              <p>
                ⏱️ <strong>Duration:</strong> {step.durationMs} ms
              </p>
            )}

            {/* Error */}
            {hasError && (
              <p style={{ color: "red" }}>
                ❌ <strong>Error:</strong> {step.error}
              </p>
            )}

            {/* Input */}
            <details>
              <summary>Input</summary>
              <pre>{JSON.stringify(step.input, null, 2)}</pre>
            </details>

            {/* Output */}
            {step.output && (
              <details>
                <summary>Output</summary>
                <pre>{JSON.stringify(step.output, null, 2)}</pre>
              </details>
            )}
          </div>
        )
      })}

      <hr />

      <h2>Final Outcome</h2>
      <pre>{JSON.stringify(execution.finalOutcome, null, 2)}</pre>
    </div>
  )
}
