/**
 * MCP Tool: search_context
 *
 * Search for past episodes and AI calls by topic or content.
 */

import { ToolRegistry, McpToolDefinition } from '../registry/ToolRegistry';
import { McpPermission } from '../permissions';
import { EpisodeStore } from '../../episodeStore';
import { ApiClient } from '../../apiClient';

const searchContext: McpToolDefinition = {
  name: 'search_context',
  description: 'Search for past episodes and AI calls by topic or content. Use mode "semantic" for vector similarity search (requires indexed project: POST /search/index).',
  version: '1.1.0',
  category: 'search',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'The search term or query' },
      mode: { type: 'string', enum: ['text', 'semantic'], description: 'Search mode: text (substring, default) or semantic (embeddings, requires indexing)' },
      limit: { type: 'number', description: 'Max results (semantic mode, default 10)' },
    },
    required: ['query'],
  },
  permissions: [McpPermission.SEARCH],
  handler: async (args, _context) => {
    const store = EpisodeStore.get();
    const projectId = store.getProjectId();
    if (!projectId) {
      throw new Error('No active project');
    }

    const mode = args.mode === 'semantic' ? 'semantic' : 'text';

    if (mode === 'semantic') {
      const res: any = await ApiClient.post('/search/semantic', {
        projectId,
        q: args.query || '',
        limit: args.limit || 10,
      });

      if (res.error) { throw new Error(res.error); }

      const resultsText = (res.results || []).map((r: any, i: number) =>
        `#${i + 1} (score ${r.score})\n  Call ID: ${r.callId}\n  Episode ID: ${r.episodeId}\n  Branch: ${r.branchName || 'N/A'}\n  Source: ${r.source || 'N/A'}\n  Text: ${(r.text || '').substring(0, 200)}`
      ).join('\n\n') || 'No indexed results. Run POST /search/index for this project first.';

      return [
        `### Semantic Search Results for "${args.query}"`,
        resultsText,
      ].join('\n');
    }

    const res: any = await ApiClient.post('/search', {
      projectId,
      q: args.query || '',
    });

    if (res.error) { throw new Error(res.error); }

    const episodesText = (res.episodes || []).map((e: any) =>
      `- [${e.status}] "${e.label}" (ID: ${e.id}, Branch: ${e.branchName})`
    ).join('\n') || 'None';

    const callsText = (res.calls || []).map((c: any) =>
      `- Call ID: ${c.id}\n  Episode ID: ${c.episodeId}\n  Source: ${c.source}\n  Prompt: ${c.promptText.substring(0, 100)}...\n  Response: ${c.modelResponse.substring(0, 100)}...`
    ).join('\n\n') || 'None';

    const lines = [
      `### Search Results for "${args.query}"`,
      `**Episodes:**`,
      episodesText,
      `\n**AI Calls:**`,
      callsText,
    ];
    return lines.join('\n');
  },
};

ToolRegistry.getInstance().register(searchContext);

export default searchContext;
