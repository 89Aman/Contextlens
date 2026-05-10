import { Sparkles, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react'
import type { BranchSummaryResult } from '../../types'
import { Spinner } from '../ui/Spinner'
import { CopyButton } from '../ui/CopyButton'

interface BranchSummaryCardProps {
  result: BranchSummaryResult | null
  loading: boolean
  error: string | null
  onRetry?: () => void
}

function buildMarkdown(result: BranchSummaryResult): string {
  return `## Summary\n${result.pr_summary}\n\n### Key Changes\n${result.key_changes.map((c) => `- ${c}`).join('\n')}\n\n### Review Risks\n${result.review_risks.map((r) => `- ⚠ ${r}`).join('\n')}`
}

export function BranchSummaryCard({ result, loading, error, onRetry }: BranchSummaryCardProps) {
  return (
    <div className="rounded-lg bg-card border-l-4 border-l-primary border border-cardBorder p-4">
      {loading && (
        <div className="flex items-center gap-3 py-2">
          <Spinner size="sm" />
          <span className="text-sm text-textMuted">Generating PR summary...</span>
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">
                Branch Summary
              </span>
            </div>
            <CopyButton text={buildMarkdown(result)} label="Copy as PR" />
          </div>

          {/* PR Summary */}
          <p className="text-sm text-textPrimary leading-relaxed">{result.pr_summary}</p>

          {/* Divider */}
          <div className="border-t border-cardBorder" />

          {/* Key Changes */}
          {result.key_changes.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                <span className="text-[10px] font-semibold text-green-400 uppercase tracking-wider">
                  Key Changes
                </span>
              </div>
              <ul className="space-y-1">
                {result.key_changes.map((change, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-textMuted">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{change}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Review Risks */}
          {result.review_risks.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">
                  Review Risks
                </span>
              </div>
              <ul className="space-y-1">
                {result.review_risks.map((risk, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-textMuted">
                    <span className="text-amber-500 mt-0.5 flex-shrink-0">⚠</span>
                    <span>{risk}</span>
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
