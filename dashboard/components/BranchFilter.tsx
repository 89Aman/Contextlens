import { useState } from "react";
import { getProjectEpisodes } from "@/lib/api";
import { Episode } from "@/types";

export default function BranchFilter({
  projectId
}: {
  projectId: string;
}) {
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [branches, setBranches] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // In a real app, we would fetch branches from the backend
  // For now, we'll extract them from episodes
  useEffect(() => {
    loadBranches();
  }, [projectId]);

  async function loadBranches() {
    setLoading(true);
    try {
      const episodes = await getProjectEpisodes(projectId);
      const uniqueBranches = [...new Set(episodes.map((ep) => ep.branchName))];
      setBranches(uniqueBranches.sort());
    } catch (error) {
      console.error('Failed to load branches:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <span className="h-3 w-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <span className="text-xs text-gray-500 dark:text-gray-400">Loading branches...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <span className="text-xs text-gray-600 dark:text-gray-400">Branch:</span>
      <select
        value={selectedBranch ?? ""}
        onChange={(e) => setSelectedBranch(e.target.value || null)}
        className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
      >
        <option value="">All branches</option>
        {branches.map((branch) => (
          <option key={branch} value={branch}>
            {branch}
          </option>
        ))}
      </select>
    </div>
  );
}