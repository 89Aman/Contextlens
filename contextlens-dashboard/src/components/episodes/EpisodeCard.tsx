import { useState, memo, useCallback } from 'react'
import { ChevronDown, ArrowUpRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { Episode } from '../../types'
import { Badge } from '../ui/Badge'
import { SkeletonCard } from '../ui/SkeletonCard'
import { ErrorMessage } from '../ui/ErrorMessage'
import { CallItem } from './CallItem'
import { ExplainDiffCard } from '../ai/ExplainDiffCard'
import { useCalls } from '../../lib/firestoreHooks'
import { timeAgo, formatDate } from '../../lib/utils'

interface EpisodeCardProps {
  episode: Episode
  projectId: string
  uid: string
}

export const EpisodeCard = memo(function EpisodeCard({ episode, projectId, uid }: EpisodeCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [fetchEnabled, setFetchEnabled] = useState(false)
  const navigate = useNavigate()

  const { data: calls, loading: callsLoading, error: callsError } = useCalls(
    uid,
    projectId,
    episode.id,
    fetchEnabled,
  )

  const handleToggle = useCallback(() => {
    if (!isExpanded && !fetchEnabled) setFetchEnabled(true)
    setIsExpanded((p) => !p)
  }, [isExpanded, fetchEnabled])

  const handleOpenDetail = useCallback(() => {
    navigate(`/dashboard/${projectId}/episodes/${episode.id}`)
  }, [navigate, projectId, episode.id])

  const statusVariant = episode.status === 'active' ? 'status-active' : 'status-closed'

  return (
    <div className="rounded-xl bg-card border border-cardBorder card-glow overflow-hidden">
      {/* Collapsed header */}
      <button
        onClick={handleToggle}
        className="w-full text-left px-4 py-3.5 flex items-start gap-3 hover:bg-white/[0.02] transition-colors duration-150"
        aria-expanded={isExpanded}
      >
        <div className="mt-0.5 flex-shrink-0">
          <ChevronDown
            className={`w-4 h-4 text-textMuted transition-transform duration-250 ease-out ${
              isExpanded ? 'rotate-180' : ''
            }`}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-textPrimary truncate">{episode.label}</p>
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <Badge text={episode.branchName} variant="branch" />
            <Badge text={episode.status} variant={statusVariant} />
            <span className="text-[11px] text-textMuted/60">{episode.callCount} calls</span>
            {episode.changedFiles.length > 0 && (
              <span className="text-[11px] text-textMuted/60">
                · {episode.changedFiles.length} file{episode.changedFiles.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
        <div className="text-[11px] text-textMuted/50 flex-shrink-0 text-right">
          <p>{timeAgo(episode.startedAt)}</p>
          {episode.endedAt && (
            <p className="mt-0.5 text-[10px]">
              {formatDate(episode.startedAt).split(',')[0]}
            </p>
          )}
        </div>
      </button>

      {/* Expanded content — animated */}
      <div
        className={`transition-all duration-300 ease-out overflow-hidden ${
          isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="border-t border-cardBorder/60">
          {/* ExplainDiff summary */}
          {episode.explainDiffSummary && (
            <div className="px-4 py-3 border-b border-cardBorder/60 bg-surface/30">
              <ExplainDiffCard
                result={{
                  summary: episode.explainDiffSummary,
                  risks: episode.explainDiffRisks,
                  checks: episode.explainDiffChecks,
                }}
                loading={false}
                error={null}
              />
            </div>
          )}

          {/* AI Calls */}
          <div className="px-4 py-3">
            <p className="text-[10px] font-semibold text-textMuted/70 uppercase tracking-wider mb-3">
              AI Calls
            </p>
            {callsLoading && (
              <div className="space-y-2">
                <SkeletonCard lines={2} />
                <SkeletonCard lines={2} />
              </div>
            )}
            {callsError && <ErrorMessage message={callsError} />}
            {!callsLoading && !callsError && calls.length === 0 && (
              <p className="text-xs text-textMuted/50 py-2">No calls recorded yet.</p>
            )}
            {!callsLoading && calls.length > 0 && (
              <div className="space-y-2">
                {calls.map((call) => (
                  <CallItem key={call.id} call={call} />
                ))}
              </div>
            )}
          </div>

          {/* Open detail link */}
          <div className="px-4 pb-3">
            <button
              onClick={handleOpenDetail}
              className="flex items-center gap-1.5 text-xs text-primary hover:text-primaryLight transition-colors duration-150 group/link"
            >
              <ArrowUpRight className="w-3.5 h-3.5 transition-transform duration-150 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" />
              Open Full Detail
            </button>
          </div>
        </div>
      </div>
    </div>
  )
})
