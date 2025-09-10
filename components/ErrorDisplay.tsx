import { useState, useEffect } from 'react'
import { ErrorHandler, BlockchainError } from '../lib/errorHandler'

interface ErrorDisplayProps {
  error: BlockchainError | null
  onRetry?: () => void
  onDismiss?: () => void
  autoClose?: boolean
  autoCloseDelay?: number
}

export default function ErrorDisplay({ 
  error, 
  onRetry, 
  onDismiss, 
  autoClose = false, 
  autoCloseDelay = 5000 
}: ErrorDisplayProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    if (error) {
      setIsVisible(true)
      
      if (autoClose && error.severity === 'low') {
        const timer = setTimeout(() => {
          handleDismiss()
        }, autoCloseDelay)
        
        return () => clearTimeout(timer)
      }
    } else {
      setIsVisible(false)
    }
  }, [error, autoClose, autoCloseDelay])

  const handleDismiss = () => {
    setIsVisible(false)
    setTimeout(() => {
      onDismiss?.()
    }, 300) // Wait for animation
  }

  const handleRetry = () => {
    handleDismiss()
    onRetry?.()
  }

  if (!error || !isVisible) return null

  const display = ErrorHandler.formatErrorDisplay(error)
  const severityColor = ErrorHandler.getSeverityColor(error.severity)

  return (
    <div className={`fixed bottom-4 right-4 z-50 max-w-md transition-all duration-300 ${
      isVisible ? 'transform translate-y-0 opacity-100' : 'transform translate-y-full opacity-0'
    }`}>
      <div className={`bg-gray-900 rounded-xl border shadow-xl ${
        error.severity === 'critical' ? 'border-red-500/50 shadow-red-500/20' :
        error.severity === 'high' ? 'border-orange-500/50 shadow-orange-500/20' :
        error.severity === 'medium' ? 'border-yellow-500/50 shadow-yellow-500/20' :
        'border-blue-500/50 shadow-blue-500/20'
      }`}>
        {/* Header */}
        <div className="flex items-start justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="text-2xl">{display.icon}</div>
            <div>
              <h4 className="font-semibold text-white">{display.title}</h4>
              <p className={`text-sm ${severityColor}`}>
                {error.code.replace(/_/g, ' ').toLowerCase()}
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Message */}
        <div className="px-4 pb-4">
          <p className="text-gray-300 text-sm mb-3">
            {display.message}
          </p>

          {/* Suggestions */}
          {display.suggestions.length > 0 && (
            <div className="mb-4">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                <span>Suggestions</span>
                <svg 
                  className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {isExpanded && (
                <ul className="mt-2 space-y-1 text-sm text-gray-400">
                  {display.suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {error.retryable && onRetry && (
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            )}
            <button
              onClick={handleDismiss}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg text-sm font-medium hover:bg-gray-600 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>

        {/* Technical Details (expandable) */}
        {error.originalError && (
          <details className="border-t border-gray-700">
            <summary className="px-4 py-3 text-sm text-gray-400 cursor-pointer hover:text-white transition-colors">
              Technical Details
            </summary>
            <div className="px-4 pb-4">
              <pre className="text-xs text-gray-500 bg-black/20 rounded p-2 overflow-x-auto">
                {JSON.stringify({
                  code: error.code,
                  message: error.message,
                  context: error.context,
                  timestamp: new Date(error.timestamp).toISOString()
                }, null, 2)}
              </pre>
            </div>
          </details>
        )}
      </div>
    </div>
  )
}

// Global error display hook
export function useErrorDisplay() {
  const [currentError, setCurrentError] = useState<BlockchainError | null>(null)

  useEffect(() => {
    const unsubscribe = ErrorHandler.onError((error) => {
      setCurrentError(error)
    })

    return unsubscribe
  }, [])

  const clearError = () => setCurrentError(null)
  const showError = (error: BlockchainError) => setCurrentError(error)

  return {
    error: currentError,
    clearError,
    showError
  }
}

// Toast-style error notifications
export function ErrorToast({ error, onDismiss }: { error: BlockchainError; onDismiss: () => void }) {
  const [isVisible, setIsVisible] = useState(true)
  const display = ErrorHandler.formatErrorDisplay(error)

  useEffect(() => {
    if (error.severity === 'low') {
      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(onDismiss, 300)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [error.severity, onDismiss])

  return (
    <div className={`transition-all duration-300 ${
      isVisible ? 'transform translate-x-0 opacity-100' : 'transform translate-x-full opacity-0'
    }`}>
      <div className={`bg-gray-900 rounded-lg p-4 border shadow-lg max-w-sm ${
        error.severity === 'critical' ? 'border-red-500/50' :
        error.severity === 'high' ? 'border-orange-500/50' :
        error.severity === 'medium' ? 'border-yellow-500/50' :
        'border-blue-500/50'
      }`}>
        <div className="flex items-start gap-3">
          <div className="text-lg">{display.icon}</div>
          <div className="flex-1">
            <h4 className="font-medium text-white text-sm">{display.title}</h4>
            <p className="text-gray-300 text-xs mt-1">{display.message}</p>
          </div>
          <button
            onClick={() => {
              setIsVisible(false)
              setTimeout(onDismiss, 300)
            }}
            className="text-gray-400 hover:text-white"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

// Error boundary component
export function ErrorBoundary({ children, fallback }: { 
  children: React.ReactNode; 
  fallback?: React.ComponentType<{ error: Error; retry: () => void }> 
}) {
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      setError(new Error(event.message))
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      setError(new Error(event.reason?.message || 'Unhandled promise rejection'))
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  if (error) {
    const Fallback = fallback || DefaultErrorFallback
    return <Fallback error={error} retry={() => setError(null)} />
  }

  return <>{children}</>
}

function DefaultErrorFallback({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20 max-w-md text-center">
        <div className="text-6xl mb-4">💥</div>
        <h2 className="text-2xl font-bold text-white mb-4">Something went wrong</h2>
        <p className="text-gray-300 mb-6">
          An unexpected error occurred. Please try refreshing the page.
        </p>
        <div className="space-y-3">
          <button
            onClick={retry}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Refresh Page
          </button>
        </div>
        <details className="mt-6 text-left">
          <summary className="text-sm text-gray-400 cursor-pointer">Error Details</summary>
          <pre className="mt-2 text-xs text-gray-500 bg-black/20 rounded p-2 overflow-x-auto">
            {error.message}
          </pre>
        </details>
      </div>
    </div>
  )
}