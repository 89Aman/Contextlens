import { Sparkles, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react'
import type { ExplainDiffResult } from '../../types'
import { Spinner } from '../ui/Spinner'

interface ExplainDiffCardProps {
  result: ExplainDiffResult | null
  loading: boolean
  error: string | null
  onRetry?: () => void
}

export function ExplainDiffCard({ result, loading, error, onRetry }: ExplainDiffCardProps) {
  return (
    <div className="rounded-lg bg-card border-l-4 border-l-primary border border-cardBorder p-4">
      {loading && (
        <div className="flex items-center gap-3 py-2">
          <Spinner size="sm" />
          <span className="text-sm text-textMuted">Asking Gemini...</span>
        </div>
      )}

      {error && !loading && (
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-300 flex-1">{error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          )}
        </div>
      )}

      {result && !loading && !error && (
        <div className="space-y-3">
          {/* Label */}
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">
              Gemini Analysis
            </span>
          </div>

          {/* Summary */}
          <p className="text-sm text-textPrimary leading-relaxed">{result.summary}</p>

          {/* Divider */}
          {(result.risks.length > 0 || result.checks.length > 0) && (
            <div className="border-t border-cardBorder" />
          )}

          {/* Risks */}
          {result.risks.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">
                  Potential Risks
                </span>
              </div>
              <ul className="space-y-1">
                {result.risks.map((risk, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-textMuted">
                    <span className="text-amber-500 mt-0.5 flex-shrink-0">⚠</span>
                    <span>{risk}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Checks */}
          {result.checks.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                <span className="text-[10px] font-semibold text-green-400 uppercase tracking-wider">
                  Suggested Checks
                </span>
              </div>
              <ul className="space-y-1">
                {result.checks.map((check, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-textMuted">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{check}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
