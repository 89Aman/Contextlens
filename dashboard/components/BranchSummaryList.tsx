import { useEffect, useState } from "react";
import { getProjects } from "@/lib/api";
import { getBranchSummary } from "@/lib/api";
import { BranchSummary } from "@/types";
import LoadingSkeleton from "@/components/LoadingSkeleton";

export default function BranchSummaryList() {
  const [branchSummaries, setBranchSummaries] = useState<
    { projectId: string; branchName: string; summary: BranchSummary }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecentBranchSummaries();
  }, []);

  async function loadRecentBranchSummaries() {
    setLoading(true);
    try {
      const projects = await getProjects();
      const summaries: any[] = [];

      // For each project, get the default branch summary
      for (const project of projects) {
        try {
          const summary = await getBranchSummary(
            project.id,
            project.defaultBranch
          );
          summaries.push({
            projectId: project.id,
            branchName: project.defaultBranch,
            summary,
          });
        } catch (error) {
          console.error(
            `Failed to fetch branch summary for project ${project.id}:`,
            error
          );
        }
      }

      setBranchSummaries(summaries);
    } catch (error) {
      console.error('Failed to load branch summaries:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <LoadingSkeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (branchSummaries.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 dark:text-gray-400">
          No branch summaries yet
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {branchSummaries.map((item) => (
        <div key={`${item.projectId}-${item.branchName}`} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 flex items-center justify-center bg-green-500 rounded-full">
                <span className="text-white text-xs font-bold">
                  {item.branchName.slice(0, 2).toUpperCase()}
                </span>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {item.branchName} summary
              </h4>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {item.summary.prSummary}
              </p>
              {item.summary.keyChanges.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Key Changes:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
                    {item.summary.keyChanges.map((change, index) => (
                      <li key={index}>{change}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}