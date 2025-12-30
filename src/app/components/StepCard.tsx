'use client'

import { useState } from 'react'
import { Step } from '@/xRay'

interface StepCardProps {
  step: Step
  index: number
  children?: React.ReactNode
}

export default function StepCard({ step, index, children }: StepCardProps) {
  const [showInput, setShowInput] = useState(false)
  const [showOutput, setShowOutput] = useState(false)

  const hasError = !!step.error
  const hasInput = step.input && Object.keys(step.input).length > 0
  const hasOutput = step.output && Object.keys(step.output).length > 0

  return (
    <div className={`bg-white rounded-xl border-2 transition-all duration-200 ${
      hasError
        ? 'border-red-200 bg-red-50/30'
        : 'border-gray-200 hover:border-blue-300'
    }`}>
      {/* Header */}
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            {/* Step Number Badge */}
            <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-semibold text-sm ${
              hasError
                ? 'bg-red-100 text-red-700'
                : 'bg-blue-100 text-blue-700'
            }`}>
              {index + 1}
            </div>

            {/* Step Info */}
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 text-lg mb-1">
                {step.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </h3>
              {step.timestamp && (
                <p className="text-sm text-gray-500">
                  {new Date(step.timestamp).toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>

          {/* Duration Badge */}
          {step.durationMs !== undefined && (
            <div className="flex-shrink-0 px-3 py-1 bg-gray-100 rounded-lg">
              <div className="text-sm font-medium text-gray-900">
                {step.durationMs < 1000
                  ? `${step.durationMs}ms`
                  : `${(step.durationMs / 1000).toFixed(2)}s`}
              </div>
            </div>
          )}
        </div>

        {/* Error Display */}
        {hasError && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800 mb-1">Error</p>
                <p className="text-sm text-red-700">{step.error}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-5 space-y-4">
        {/* Auto-Reasoning (passed as children) */}
        {children}

        {/* Input/Output Toggle Buttons */}
        <div className="flex gap-2">
          {hasInput && (
            <button
              onClick={() => setShowInput(!showInput)}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <svg className={`w-4 h-4 transition-transform ${showInput ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Input
            </button>
          )}

          {hasOutput && (
            <button
              onClick={() => setShowOutput(!showOutput)}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <svg className={`w-4 h-4 transition-transform ${showOutput ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Output
            </button>
          )}
        </div>

        {/* Input Display */}
        {showInput && hasInput && (
          <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-3 py-2 bg-gray-100 border-b border-gray-200">
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Input</span>
            </div>
            <pre className="p-3 text-sm overflow-auto max-h-96 text-gray-800 font-mono">
              {JSON.stringify(step.input, null, 2)}
            </pre>
          </div>
        )}

        {/* Output Display */}
        {showOutput && hasOutput && (
          <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-3 py-2 bg-gray-100 border-b border-gray-200">
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Output</span>
            </div>
            <pre className="p-3 text-sm overflow-auto max-h-96 text-gray-800 font-mono">
              {JSON.stringify(step.output, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
