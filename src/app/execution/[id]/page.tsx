import { getExecutionById } from "@/lib/storage"
import ExecutionReasoningTrigger from "@/app/components/ExecutionReasoningTrigger"
import StepReasoning from "@/app/components/StepReasoning"

type Props = {
  params: Promise<{ id: string }>
}

export default async function ExecutionPage({ params }: Props) {
  const { id } = await params
  const execution = getExecutionById(id)

  if (!execution) {
    return <div className="p-6">Execution not found</div>
  }

  // Check if any steps are missing reasoning
  const hasAnyMissingReasoning = execution.steps.some(s => !s.reasoning)

  return (
    <main className="p-6 space-y-6">
      {/* Auto-trigger reasoning generation if any steps are missing reasoning */}
      <ExecutionReasoningTrigger
        executionId={execution.executionId}
        hasAnyMissingReasoning={hasAnyMissingReasoning}
      />
      <h1 className="text-2xl font-bold">
        Execution: {execution.executionId}
      </h1>

      {/* Metadata */}
      {execution.metadata && (
        <div className="bg-gray-100 p-3 rounded text-sm">
          <strong>Metadata</strong>
          <pre>{JSON.stringify(execution.metadata, null, 2)}</pre>
        </div>
      )}

      {/* Steps */}
      <div className="space-y-4">
        {execution.steps.map((step, index) => (
          <div
            key={index}
            className="border rounded-lg p-4 space-y-2"
          >
            <div className="flex justify-between items-center">
              <h2 className="font-semibold text-lg">{step.name}</h2>

              {step.durationMs !== undefined && (
                <span className="text-sm text-gray-500">
                  {step.durationMs} ms
                </span>
              )}
            </div>

            {/* Error */}
            {step.error && (
              <div className="text-red-600 font-medium">
                Error: {step.error}
              </div>
            )}

            {/* Input */}
            {step.input && (
              <div>
                <strong>Input</strong>
                <pre className="bg-gray-50 p-2 rounded text-sm overflow-auto">
                  {JSON.stringify(step.input, null, 2)}
                </pre>
              </div>
            )}

            {/* Output */}
            {step.output && (
              <div>
                <strong>Output</strong>
                <pre className="bg-gray-50 p-2 rounded text-sm overflow-auto">
                  {JSON.stringify(step.output, null, 2)}
                </pre>
              </div>
            )}

            {/* 🔥 DYNAMIC REASONING WITH AUTO-TRIGGER AND POLLING */}
            <StepReasoning
              executionId={execution.executionId}
              stepName={step.name}
              initialReasoning={step.reasoning}
            />

            {/* LLM step visualization (KEEP THIS BLOCK - only for LLM steps) */}
            {step.name === "llm_relevance_evaluation" && step.output && (
              <div className="mt-3 space-y-2">
                <strong>LLM Decisions</strong>

                {Array.isArray((step.output as any).evaluations) && (
                  <div className="space-y-1">
                    {(step.output as any).evaluations.map(
                      (item: any, i: number) => {
                        // Support both product & movie schemas:
                        const title =
                          item.title ||
                          item.movie?.title ||
                          "Unknown"

                        const isRelevant =
                          // product-style
                          typeof item.is_competitor === "boolean"
                            ? item.is_competitor
                            // movie-style
                            : typeof item.is_relevant === "boolean"
                              ? item.is_relevant
                              // fallback (treat as accepted if flag missing)
                              : true

                        const decisionLabel = isRelevant
                          ? "Accepted"
                          : "Rejected"

                        const decisionClass = isRelevant
                          ? "text-green-600"
                          : "text-red-600"

                        const rejectionText =
                          item.rejection_reason?.explanation ||
                          item.reason ||
                          ""

                        return (
                          <div
                            key={i}
                            className="flex justify-between items-center border rounded p-2"
                          >
                            <span>{title}</span>
                            <div className="flex flex-col items-end">
                              <span className={decisionClass}>
                                {decisionLabel}
                              </span>
                              {!isRelevant && rejectionText && (
                                <span className="text-xs text-gray-500">
                                  {rejectionText}
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      }
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Final Outcome */}
      {execution.finalOutcome && (
        <div className="border-t pt-4">
          <h2 className="text-xl font-semibold">Final Outcome</h2>
          <pre className="bg-gray-50 p-3 rounded text-sm overflow-auto">
            {JSON.stringify(execution.finalOutcome, null, 2)}
          </pre>
        </div>
      )}
    </main>
  )
}
