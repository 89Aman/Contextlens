import { useState } from "react";
import { searchEpisodes } from "@/lib/api";
import { Episode } from "@/lib/types";
import LoadingSkeleton from "@/components/LoadingSkeleton";

export default function SearchBar({
  projectId
}: {
  projectId: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const searchResults = await searchEpisodes({
        query,
        projectId // Assuming we can filter by project in search
      });
      setResults(searchResults);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSearch} className="flex items-stretch">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search episodes..."
          className="flex-1 min-w-0 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className={`px-4 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-r-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 flex items-center space-x-2`}
        >
          {loading ? (
            <>
              <LoadingSkeleton className="h-4 w-4" />
              <span className="ml-2">Searching...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-4.35-4.35M9.75 9.75l0 0"
                />
              </svg>
              <span className="ml-2">Search</span>
            </>
          )}
        </button>
      </form>
      {loading && !results.length && (
        <div className="mt-3 text-center">
          <LoadingSkeleton className="h-2 w-1/3 mx-auto" />
        </div>
      )}
      {!loading && results.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            Search Results ({results.length})
          </h3>
          <div className="space-y-2">
            {results.map((episode) => (
              <div key={episode.id} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded">
                <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {episode.label || `Session on ${episode.branchName}`}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(episode.startedAt).toLocaleString()} • {
                    episode.callCount
                  } interactions
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}