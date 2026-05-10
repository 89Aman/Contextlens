import { AlertCircle, RefreshCw } from 'lucide-react'

interface ErrorMessageProps {
  message: string
  onRetry?: () => void
}

export function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  const display =
    message === 'UNAUTHORIZED'
      ? 'Session expired. Please sign in again.'
      : message.startsWith('API_ERROR_500')
      ? 'Server error. Please try again.'
      : message.includes('network') || message.includes('fetch')
      ? 'Connection error. Check your network.'
      : message

  return (
    <div className="flex items-start gap-3 p-4 rounded-lg bg-red-900/20 border border-red-700/40">
      <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-red-300">{display}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors flex-shrink-0"
        >
          <RefreshCw className="w-3 h-3" />
          Retry
        </button>
      )}
    </div>
  )
}
