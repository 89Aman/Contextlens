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
    <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/5 border border-red-500/15 animate-fadeIn">
      <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
        <AlertCircle className="w-4 h-4 text-red-400/80" />
      </div>
      <div className="flex-1 min-w-0 pt-1">
        <p className="text-sm text-red-300/80">{display}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-red-400/70 hover:text-red-300 hover:bg-red-500/10
                     transition-all duration-150 flex-shrink-0"
        >
          <RefreshCw className="w-3 h-3" />
          Retry
        </button>
      )}
    </div>
  )
}
