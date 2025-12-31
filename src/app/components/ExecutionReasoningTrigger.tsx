"use client"

import { useEffect } from "react"

interface Props {
  executionId: string
  hasAnyMissingReasoning: boolean
}

export default function ExecutionReasoningTrigger({
  executionId,
  hasAnyMissingReasoning
}: Props) {
  useEffect(() => {
    if (!hasAnyMissingReasoning) return

    const storageKey = `reasoningTriggered:${executionId}`
    const wasTriggered = localStorage.getItem(storageKey)

    if (!wasTriggered) {
      fetch("/api/internal/reasoning/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ executionId })
      })
        .then(response => {
          if (response.ok) {
            localStorage.setItem(storageKey, "true")
            console.log(`[UI] Triggered reasoning generation for ${executionId}`)
          }
        })
        .catch(error => {
          console.error("Failed to trigger reasoning:", error)
        })
    }
  }, [executionId, hasAnyMissingReasoning])

  return null // This component only handles side effects
}
