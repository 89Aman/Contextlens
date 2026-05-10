import type { Episode } from '../../types'
import { EpisodeCard } from './EpisodeCard'

interface EpisodeTimelineProps {
  episodes: Episode[]
  projectId: string
  uid: string
}

export function EpisodeTimeline({ episodes, projectId, uid }: EpisodeTimelineProps) {
  return (
    <div className="space-y-2">
      {episodes.map((ep) => (
        <EpisodeCard key={ep.id} episode={ep} projectId={projectId} uid={uid} />
      ))}
    </div>
  )
}
