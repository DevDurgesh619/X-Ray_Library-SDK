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
          const response = await fetch(`/api/execution/${executionId}`)
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
      <div className="bg-gray-50 p-3 rounded border-l-4 border-gray-300 mt-2 flex items-center gap-2">
        <div className="animate-spin h-4 w-4 border-2 border-gray-500 border-t-transparent rounded-full"></div>
        <span className="text-gray-600">Generating reasoning...</span>
      </div>
    )
  }

  if (!reasoning) {
    return null
  }

  return (
    <div className="bg-blue-50 p-3 rounded border-l-4 border-blue-400 mt-2">
      <strong>🤖 Auto-Reasoning</strong>: {reasoning}
    </div>
  )
}
