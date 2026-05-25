import { useMemo } from 'react'
import { Link, useParams, useMatches } from 'react-router-dom'
import { Search, X, ChevronRight } from 'lucide-react'
import { useSearch } from '../../context/SearchContext'
import { useAuth } from '../../context/AuthContext'
import { useProjects } from '../../lib/firestoreHooks'

export function TopBar() {
  const { user } = useAuth()
  const { searchQuery, setSearchQuery } = useSearch()
  const { projectId, episodeId, branchName } = useParams()
  const { data: projects } = useProjects(user?.uid ?? '')
  const matches = useMatches()

  const isSearchablePage = useMemo(() => {
    return !matches.some((m) => {
      const path = m.pathname as string
      return path.includes('settings') || path.includes('setup')
    })
  }, [matches])

  const currentProject = projects.find((p) => p.id === projectId)

  const crumbs = useMemo(() => {
    const c: { label: string; href: string }[] = [
      { label: 'Home', href: '/dashboard' },
    ]
    if (currentProject) {
      c.push({ label: currentProject.name, href: `/dashboard/${projectId}` })
    }
    if (episodeId) {
      c.push({
        label: 'Episode',
        href: `/dashboard/${projectId}/episodes/${episodeId}`,
      })
    }
    if (branchName) {
      c.push({
        label: decodeURIComponent(branchName),
        href: `/dashboard/${projectId}/branch/${branchName}`,
      })
    }
    const isSettings = matches.some((m) => (m.pathname as string).includes('settings'))
    if (isSettings) {
      c.push({ label: 'Settings', href: '/dashboard/settings' })
    }
    return c
  }, [currentProject, projectId, episodeId, branchName, matches])

  return (
    <header className="h-12 flex items-center justify-between px-6 border-b border-cardBorder/60 bg-surface flex-shrink-0">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm">
        {crumbs.map((crumb, i) => (
          <span key={crumb.href} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="w-3 h-3 text-textMuted/30" />}
            {i === crumbs.length - 1 ? (
              <span className="text-textPrimary font-medium">{crumb.label}</span>
            ) : (
              <Link
                to={crumb.href}
                className="text-textMuted/60 hover:text-textPrimary transition-colors duration-150"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        ))}
      </nav>

      {/* Right actions */}
      <div className="flex items-center gap-3">
        {isSearchablePage && (
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-textMuted/40 group-focus-within:text-primary transition-colors duration-150" />
            <input
              type="text"
              placeholder="Search episodes…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-44 bg-white/[0.03] border border-cardBorder/50 rounded-lg pl-8 pr-8 py-1.5 text-xs text-textPrimary
                         placeholder:text-textMuted/30
                         focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 focus:w-64
                         transition-all duration-200"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-textMuted/40 hover:text-primary transition-colors duration-150"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
