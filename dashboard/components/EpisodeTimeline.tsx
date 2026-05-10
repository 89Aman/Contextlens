import { useEffect, useState } from "react";
import { getProjects } from "@/lib/api";
import { getProjectEpisodes } from "@/lib/api";
import { Episode } from "@/types";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import EpisodeCard from "@/components/EpisodeCard";

export default function EpisodeTimeline() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecentEpisodes();
  }, []);

  async function loadRecentEpisodes() {
    setLoading(true);
    try {
      const projects = await getProjects();
      let allEpisodes: Episode[] = [];

      // Fetch episodes from all projects (limit to recent ones)
      for (const project of projects) {
        try {
          const projectEpisodes = await getProjectEpisodes(project.id);
          allEpisodes = [...allEpisodes, ...projectEpisodes];
        } catch (error) {
          console.error(`Failed to fetch episodes for project ${project.id}:`, error);
        }
      }

      // Sort by startedAt descending and take top 10
      allEpisodes.sort(
        (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
      );
      setEpisodes(allEpisodes.slice(0, 10));
    } catch (error) {
      console.error('Failed to load episodes:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <LoadingSkeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (episodes.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 dark:text-gray-400">
          No recent activity yet
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {episodes.map((episode) => (
        <EpisodeCard key={episode.id} episode={episode} />
      ))}
    </div>
  );
}