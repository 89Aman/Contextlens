import Link from "next/link";
import { Episode } from "@/lib/types";

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface EpisodeCardProps {
  episode: Episode;
  showTimeline?: boolean;
}

export default function EpisodeCard({ episode, showTimeline = true }: EpisodeCardProps) {
  return (
    <div className={showTimeline ? "timeline-item" : ""}>
      {showTimeline && (
        <div className={`timeline-dot ${episode.status === "closed" ? "closed" : ""}`} />
      )}
      <div style={{ flex: 1 }}>
        <Link href={`/episode/${episode.id}`} style={{ textDecoration: "none" }}>
          <div className="card" style={{ cursor: "pointer" }}>
            <div className="flex items-center gap-2 mb-2">
              <h3 style={{ margin: 0, fontSize: "13px", fontWeight: 600 }}>{episode.label}</h3>
              <span className={`badge ${episode.status === "active" ? "badge-green" : "badge-gray"}`}>
                {episode.status}
              </span>
            </div>

            <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
              <span className="badge badge-indigo">
                <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 3v12m0 0a3 3 0 106 0m-6 0a3 3 0 000 6m0-6h12m0 0V9m0 6a3 3 0 100-6" />
                </svg>
                {episode.branchName}
              </span>
              {episode.changedFiles?.length > 0 && (
                <span className="badge badge-gray">
                  {episode.changedFiles.length} file{episode.changedFiles.length !== 1 ? "s" : ""}
                </span>
              )}
              {episode.callCount > 0 && (
                <span className="badge badge-gray">
                  {episode.callCount} call{episode.callCount !== 1 ? "s" : ""}
                </span>
              )}
              <span className="badge badge-gray">{formatRelativeTime(episode.startedAt)}</span>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}