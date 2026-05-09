const explainDiffTemplate = ({ changedFilesList }) => `You are an assistant that explains code diffs.
- What changed: summarize the changes across files: ${changedFilesList}
- Why it likely changed: explain intent and reason.
- What might break: list plausible breakages and edge cases.
- What should be tested: provide focused tests.

Return strictly JSON with keys: summary, risks (array), checks (array).
`;

const branchSummaryTemplate = ({ episodesSummaryList }) => `You are an assistant that summarizes a branch / PR.
- What the PR does: aggregate: ${episodesSummaryList}
- Key changes: enumerate
- Review risks: list

Return strictly JSON with keys: pr_summary, key_changes (array), review_risks (array).
`;

module.exports = { explainDiffTemplate, branchSummaryTemplate };
