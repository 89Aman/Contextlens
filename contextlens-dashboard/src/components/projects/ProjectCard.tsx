import { memo } from 'react'
import { Link } from 'react-router-dom'
import { Folder, ArrowUpRight } from 'lucide-react'
import type { Project } from '../../types'
import { Badge } from '../ui/Badge'
import { timeAgo } from '../../lib/utils'

interface ProjectCardProps {
  project: Project
}

export const ProjectCard = memo(function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link
      to={`/dashboard/${project.id}`}
      className="block bg-card border border-cardBorder rounded-xl p-4 card-glow group relative overflow-hidden"
    >
      {/* Subtle top gradient accent */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0">
            <Folder className="w-4 h-4 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-textPrimary group-hover:text-primary transition-colors duration-200 truncate">
            {project.name}
          </h3>
        </div>
        <ArrowUpRight className="w-4 h-4 text-textMuted opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-0.5 group-hover:translate-y-0 flex-shrink-0" />
      </div>

      {project.repoUrl && (
        <p className="text-[11px] text-textMuted/60 font-mono truncate mb-3">
          {project.repoUrl.replace('https://github.com/', '').replace('git@github.com:', '')}
        </p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <Badge text={project.defaultBranch} variant="branch" />
        <span className="text-[11px] text-textMuted/50">
          {timeAgo(project.updatedAt)}
        </span>
      </div>
    </Link>
  )
})
