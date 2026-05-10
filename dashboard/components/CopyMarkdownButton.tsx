import { useState } from "react";

export default function CopyMarkdownButton({
  projectId,
  branchName,
  branchSummary,
  episodes
}: {
  projectId: string;
  branchName: string;
  branchSummary?: any;
  episodes: any[];
}) {
  const [isCopied, setIsCopied] = useState(false);

  const generateMarkdown = () => {
    let markdown = `# Branch Summary: ${branchName}\n\n`;
    markdown += `## Project\n`;
    // We don't have project name here, but we could pass it or fetch it
    markdown += `**Branch:** ${branchName}\n\n`;

    markdown += `## Summary\n\n`;
    markdown += `${branchSummary?.prSummary || 'No summary available'}\n\n`;

    if (branchSummary?.keyChanges?.length) {
      markdown += `## Key Changes\n\n`;
      branchSummary.keyChanges.forEach((change: string, index: number) => {
        markdown += `${index + 1}. ${change}\n`;
      });
      markdown += `\n`;
    }

    if (branchSummary?.reviewRisks?.length) {
      markdown += `## Review Risks\n\n`;
      branchSummary.reviewRisks.forEach((risk: string, index: number) => {
        markdown += `${index + 1}. ${risk}\n`;
      });
      markdown += `\n`;
    }

    markdown += `## Episodes\n\n`;
    episodes.forEach((episode: any, index: number) => {
      markdown += `### Episode ${index + 1}: ${episode.label || `Session on ${episode.branchName}`}\n\n`;
      markdown += `**Started:** ${new Date(episode.startedAt).toLocaleString()}\n\n`;
      if (episode.episodeSummary) {
        markdown += `**Summary:**\n${episode.episodeSummary}\n\n`;
      }
      if (episode.explainDiffSummary) {
        markdown += `**AI Explanation:**\n${episode.explainDiffSummary}\n\n`;
      }
      markdown += `---\n\n`;
    });

    return markdown;
  };

  const handleCopy = async () => {
    try {
      const markdown = generateMarkdown();
      await navigator.clipboard.writeText(markdown);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      // In a real app, we might show an error message
    }
  };

  return (
    <button
      onClick={handleCopy}
      disabled={!episodes.length || !branchSummary}
      className={`w-full flex items-center justify-center px-4 py-2 text-sm font-medium
        ${isCopied
          ? 'bg-green-600 dark:bg-green-500 text-white hover:bg-green-700 dark:hover:bg-green-400'
          : 'bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600'}
        disabled:opacity-50
      `}
    >
      {isCopied ? (
        <>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h2m12 4h2m-8 0H8m8 8V6m0 0l-2 2m2-2l2 2m2-2H6a2 2 0 01-2-2v2m0 0l-2 2m2-2l2 2"
            />
          </svg>
          Copy as Markdown
        </>
      )}
    </button>
  );
}