import Link from 'next/link'
import { Execution } from '@/xRay'

interface ExecutionCardProps {
  execution: Execution
}

export default function ExecutionCard({ execution }: ExecutionCardProps) {
  const totalSteps = execution.steps.length
  const successfulSteps = execution.steps.filter(s => !s.error).length
  const failedSteps = execution.steps.filter(s => s.error).length
  const hasReasoning = execution.steps.some(s => s.reasoning)

  const duration = execution.endedAt
    ? new Date(execution.endedAt).getTime() - new Date(execution.startedAt).getTime()
    : null

  const isComplete = !!execution.endedAt
  const hasErrors = failedSteps > 0

  return (
    <Link href={`/execution/${execution.executionId}`}>
      <div className="group bg-white rounded-xl border border-gray-200 hover:border-blue-400 hover:shadow-lg transition-all duration-200 p-5 cursor-pointer">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                {execution.executionId}
              </h3>
              {isComplete ? (
                hasErrors ? (
                  <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                    Failed
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                    Success
                  </span>
                )
              ) : (
                <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full animate-pulse">
                  Running
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">
              {new Date(execution.startedAt).toLocaleString()}
            </p>
          </div>

          {duration !== null && (
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">
                {duration < 1000 ? `${duration}ms` : `${(duration / 1000).toFixed(2)}s`}
              </div>
              <div className="text-xs text-gray-500">duration</div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span className="text-gray-600">{totalSteps} steps</span>
          </div>

          {successfulSteps > 0 && (
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-green-600">{successfulSteps}</span>
            </div>
          )}

          {failedSteps > 0 && (
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="text-red-600">{failedSteps}</span>
            </div>
          )}

          {hasReasoning && (
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span className="text-blue-600">AI</span>
            </div>
          )}
        </div>

        {execution.metadata?.projectId && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <span className="text-xs text-gray-500">
              Project: <span className="font-medium text-gray-700">{execution.metadata.projectId}</span>
            </span>
          </div>
        )}
      </div>
    </Link>
  )
}
