import Link from "next/link";
import { Project } from "@/lib/types";

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function ProjectCard({ project }: { project: Project }) {
  return (
    <Link href={`/project/${project.id}`} style={{ textDecoration: "none" }}>
      <div className="card" style={{ cursor: "pointer" }}>
        <div className="flex items-center gap-2 mb-2">
          <svg width="14" height="14" fill="none" stroke="var(--primary-light)" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h3.5L10 7h9a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
          </svg>
          <h3 style={{ margin: 0 }}>{project.name}</h3>
        </div>

        {project.repoUrl && (
          <p className="text-dim mono mb-2" style={{ fontSize: "11px" }}>
            {project.repoUrl.replace("https://", "")}
          </p>
        )}

        <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
          <span className="badge badge-indigo">
            <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 3v12m0 0a3 3 0 106 0m-6 0a3 3 0 000 6m0-6h12m0 0V9m0 6a3 3 0 100-6" />
            </svg>
            {project.defaultBranch || "main"}
          </span>
          <span className="badge badge-gray">
            {formatRelativeTime(project.updatedAt)}
          </span>
        </div>
      </div>
    </Link>
  );
}