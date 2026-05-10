import { useState } from "react";

export default function DiffViewer({
  diffSnapshot,
  diffHash
}: {
  diffSnapshot?: string; // Base64 encoded or text
  diffHash?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  // In a real app, we would decode the base64 diffSnapshot
  // For now, we'll show a placeholder or the raw text
  const getDiffContent = () => {
    if (!diffSnapshot) return "No diff available";

    try {
      // Try to decode as base64
      const decoded = atob(diffSnapshot);
      return decoded;
    } catch (e) {
      // If not base64, show as text
      return diffSnapshot;
    }
  };

  return (
    <div>
      <div className="mb-4">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 flex items-center space-x-1"
        >
          {isExpanded ? 'Collapse' : 'Expand'} Diff
          <svg className="w-4 h-4 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
        {diffHash && (
          <span className="ml-3 text-xs text-gray-500 dark:text-gray-400">
            Hash: {diffHash.slice(0, 8)}...
          </span>
        )}
      </div>

      {isExpanded && (
        <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded border border-gray-200 dark:border-gray-700">
          <div className="text-sm font-mono whitespace-pre-wrap bg-gray-100 dark:bg-gray-900 p-3 rounded overflow-auto max-h-96">
            {getDiffContent()}
          </div>
        </div>
      )}
    </div>
  );
}