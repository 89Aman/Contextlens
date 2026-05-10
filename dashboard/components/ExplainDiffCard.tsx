import { ExplainDiffResult } from "@/lib/types";

export default function ExplainDiffCard({
  result
}: {
  result: ExplainDiffResult;
}) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          AI Explanation
        </h2>
      </div>
      <div className="p-4 space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Summary
          </h3>
          <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
            {result.summary}
          </p>
        </div>

        {result.risks.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Potential Risks
            </h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-800 dark:text-gray-200">
              {result.risks.map((risk, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <svg className="w-3 h-3 mt-0.5 flex-shrink-0 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>{risk}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {result.checks.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Recommended Checks
            </h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-800 dark:text-gray-200">
              {result.checks.map((check, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <svg className="w-3 h-3 mt-0.5 flex-shrink-0 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 01-18 0 9 9 0 0018 0z"
                    />
                  </svg>
                  <span>{check}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}