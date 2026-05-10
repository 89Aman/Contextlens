export interface User {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  createdAt: string; // ISO timestamp
}

export interface ProjectSettings {
  preferredModel: string;
  redactionEnabled: boolean;
  autoSummariesEnabled: boolean;
}

export interface Project {
  id: string;
  name: string;
  repoUrl: string;
  localWorkspaceName: string;
  defaultBranch: string;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  settings: ProjectSettings;
}

export interface Episode {
  id: string;
  label: string;
  branchName: string;
  status: 'active' | 'closed';
  startedAt: string; // ISO timestamp
  endedAt?: string; // ISO timestamp
  callCount: number;
  changedFiles: string[];
  latestDiffHash?: string;
  manualNotes?: string;
  episodeSummary?: string;
  explainDiffSummary?: string;
  explainDiffRisks?: string[];
  explainDiffChecks?: string[];
}

export interface Call {
  id: string;
  createdAt: string; // ISO timestamp
  source: 'extension' | 'dashboard';
  intentTag: string;
  promptText: string;
  modelResponse: string;
  modelName: string;
  branchName: string;
  activeFilePath?: string;
  relatedFiles: string[];
  diffSnapshot?: string; // Base64 or URL to diff image
  diffHash: string;
  todoMatches: string[];
  latencyMs: number;
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  status: 'completed' | 'failed';
}

export interface BranchSummary {
  prSummary: string;
  keyChanges: string[];
  reviewRisks: string[];
}

export interface ExplainDiffResult {
  summary: string;
  risks: string[];
  checks: string[];
}

export interface SearchResult {
  episodes: Episode[];
  calls: Call[];
}