import { useState, useEffect, useRef } from 'react'
import { search, SearchFilters } from '../lib/api'
import type { Episode } from '../types'

export function useProjectSearch(projectId: string, episodes: Episode[], searchQuery: string, branchFilter: string) {
  const [searchResults, setSearchResults] = useState<Episode[] | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    
    if (!searchQuery.trim()) {
      setSearchResults(null)
      return
    }

    searchTimer.current = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const filters: SearchFilters = {}
        if (branchFilter) filters.branchName = branchFilter
        
        const results = await search(projectId, searchQuery, filters)
        const matchedIds = new Set(results.episodes.map((e) => e.episodeId))
        
        // Match API results with local episode data to get full objects
        setSearchResults(episodes.filter((e) => matchedIds.has(e.id)))
      } catch (err) {
        console.error('Search failed:', err)
        // If API fails, we could potentially do a local search fallback here
        const localResults = episodes.filter(e => 
          e.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.branchName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.changedFiles.some(f => f.toLowerCase().includes(searchQuery.toLowerCase()))
        )
        setSearchResults(localResults)
      } finally {
        setSearchLoading(false)
      }
    }, 300)

    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current)
    }
  }, [searchQuery, branchFilter, episodes, projectId])

  return { searchResults, searchLoading }
}
