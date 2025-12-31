"use client"

import { useEffect, useState } from "react"

interface StepReasoningProps {
  executionId: string
  stepName: string
  initialReasoning?: string
}

export default function StepReasoning({
  executionId,
  stepName,
  initialReasoning
}: StepReasoningProps) {
  const [reasoning, setReasoning] = useState<string | undefined>(initialReasoning)
  const [isLoading, setIsLoading] = useState(!initialReasoning)
  const [pollCount, setPollCount] = useState(0)
  const MAX_POLLS = 30 // 60 seconds max (30 * 2s)

  useEffect(() => {
    // If reasoning already exists, don't poll
    if (initialReasoning) {
      setIsLoading(false)
      return
    }

    // Wait 3 seconds before starting to poll
    const initialDelay = setTimeout(() => {
      // Start polling every 2 seconds
      const pollInterval = setInterval(async () => {
        // Stop polling after max attempts
        if (pollCount >= MAX_POLLS) {
          setIsLoading(false)
          clearInterval(pollInterval)
          console.warn(`[UI] Max poll attempts reached for ${stepName}`)
          return
        }

        setPollCount(prev => prev + 1)

        try {
          const response = await fetch(`/api/internal/execution/${executionId}`)
          if (!response.ok) {
            console.error(`[UI] Failed to fetch execution: ${response.statusText}`)
            return
          }

          const execution = await response.json()

          // Find the step with matching name
          const step = execution.steps?.find((s: any) => s.name === stepName)

          if (step?.reasoning) {
            setReasoning(step.reasoning)
            setIsLoading(false)
            clearInterval(pollInterval)
            console.log(`[UI] Reasoning loaded for ${stepName}`)
          }
        } catch (error) {
          console.error(`[UI] Error polling execution:`, error)
        }
      }, 2000)

      // Cleanup interval on unmount
      return () => clearInterval(pollInterval)
    }, 3000)

    // Cleanup timeout on unmount
    return () => clearTimeout(initialDelay)
  }, [executionId, stepName, initialReasoning, pollCount])

  if (isLoading) {
    return (
      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="relative w-5 h-5">
            <div className="absolute inset-0 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
            <div className="absolute inset-1 border-2 border-blue-300 border-t-transparent rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>
          </div>
          <div>
            <p className="text-sm font-medium text-blue-900">Generating AI reasoning...</p>
            <p className="text-xs text-blue-600 mt-0.5">This may take a few seconds</p>
          </div>
        </div>
      </div>
    )
  }

  if (!reasoning) {
    return null
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">AI Reasoning</p>
          <p className="text-sm text-gray-800 leading-relaxed">{reasoning}</p>
        </div>
      </div>
    </div>
  )
}
