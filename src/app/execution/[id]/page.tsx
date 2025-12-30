import Link from "next/link"
import { getExecutionById } from "@/lib/storage"
import ExecutionReasoningTrigger from "@/app/components/ExecutionReasoningTrigger"
import StepReasoning from "@/app/components/StepReasoning"
import StepCard from "@/app/components/StepCard"

type Props = {
  params: Promise<{ id: string }>
}

export default async function ExecutionPage({ params }: Props) {
  const { id } = await params
  const execution = await getExecutionById(id)

  if (!execution) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Execution not found</h2>
          <p className="text-gray-500 mb-6">The execution ID you're looking for doesn't exist</p>
          <Link href="/" className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors inline-block">
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const hasAnyMissingReasoning = execution.steps.some(s => !s.reasoning)
  const totalDuration = execution.endedAt
    ? new Date(execution.endedAt).getTime() - new Date(execution.startedAt).getTime()
    : null
  const successfulSteps = execution.steps.filter(s => !s.error).length
  const failedSteps = execution.steps.filter(s => s.error).length
  const hasErrors = failedSteps > 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <ExecutionReasoningTrigger
        executionId={execution.executionId}
        hasAnyMissingReasoning={hasAnyMissingReasoning}
      />

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-gray-500 hover:text-gray-700 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-gray-900">{execution.executionId}</h1>
                {execution.endedAt ? (
                  hasErrors ? (
                    <span className="px-3 py-1 text-sm font-medium bg-red-100 text-red-700 rounded-full">Failed</span>
                  ) : (
                    <span className="px-3 py-1 text-sm font-medium bg-green-100 text-green-700 rounded-full">Success</span>
                  )
                ) : (
                  <span className="px-3 py-1 text-sm font-medium bg-yellow-100 text-yellow-700 rounded-full animate-pulse">Running</span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1">Started {new Date(execution.startedAt).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Steps</p>
                <p className="text-3xl font-bold text-gray-900">{execution.steps.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Successful</p>
                <p className="text-3xl font-bold text-green-600">{successfulSteps}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Failed</p>
                <p className="text-3xl font-bold text-red-600">{failedSteps}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Duration</p>
                <p className="text-3xl font-bold text-gray-900">
                  {totalDuration !== null ? (totalDuration < 1000 ? `${totalDuration}ms` : `${(totalDuration / 1000).toFixed(1)}s`) : '-'}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Metadata */}
        {execution.metadata && Object.keys(execution.metadata).length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Metadata</h3>
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
              <pre className="text-sm text-gray-800 font-mono overflow-auto">{JSON.stringify(execution.metadata, null, 2)}</pre>
            </div>
          </div>
        )}

        {/* Steps */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Pipeline Steps</h2>
          <div className="space-y-4">
            {execution.steps.map((step, index) => (
              <StepCard key={index} step={step} index={index}>
                <StepReasoning
                  executionId={execution.executionId}
                  stepName={step.name}
                  initialReasoning={step.reasoning}
                />

                {/* LLM step visualization */}
                {step.name === "llm_relevance_evaluation" && step.output && (
                  <div className="mt-4 space-y-2">
                    <h4 className="text-sm font-semibold text-gray-700">LLM Decisions</h4>
                    {Array.isArray((step.output as any).evaluations) && (
                      <div className="space-y-2">
                        {(step.output as any).evaluations.map((item: any, i: number) => {
                          const title = item.title || item.movie?.title || "Unknown"
                          const isRelevant = typeof item.is_competitor === "boolean" ? item.is_competitor : typeof item.is_relevant === "boolean" ? item.is_relevant : true
                          const decisionLabel = isRelevant ? "Accepted" : "Rejected"
                          const rejectionText = item.rejection_reason?.explanation || item.reason || ""
                          return (
                            <div key={i} className={`flex justify-between items-center border-2 rounded-lg p-3 ${isRelevant ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                              <span className="font-medium text-gray-900">{title}</span>
                              <div className="flex flex-col items-end">
                                <span className={`text-sm font-semibold ${isRelevant ? 'text-green-700' : 'text-red-700'}`}>{decisionLabel}</span>
                                {!isRelevant && rejectionText && <span className="text-xs text-gray-600 mt-1">{rejectionText}</span>}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </StepCard>
            ))}
          </div>
        </div>

        {/* Final Outcome */}
        {execution.finalOutcome && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Final Outcome</h3>
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
              <pre className="text-sm text-gray-800 font-mono overflow-auto">{JSON.stringify(execution.finalOutcome, null, 2)}</pre>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
