/**
 * MCP Tools: contextlens_get_graph and contextlens_log_decision
 * 
 * Exposes local knowledge graph to AI assistants (Claude, Cursor, Antigravity).
 */

import { ToolRegistry, McpToolDefinition } from '../registry/ToolRegistry';
import { McpPermission } from '../permissions';
import { EpisodeStore } from '../../episodeStore';
import { GraphStore } from '../../graph/graphStore';

const getGraphTool: McpToolDefinition = {
  name: 'contextlens_get_graph',
  description: 'Retrieve ContextLens local knowledge graph nodes and edges for active episode or whole project',
  version: '1.0.0',
  category: 'memory',
  inputSchema: {
    type: 'object',
    properties: {
      scope: {
        type: 'string',
        enum: ['episode', 'project'],
        description: 'Scope of graph to retrieve (default: episode)'
      }
    }
  },
  permissions: [McpPermission.READ],
  handler: async (args, _context) => {
    const store = EpisodeStore.get();
    const root = store.getActiveWorkspaceRoot();
    if (!root) {
      return JSON.stringify({ error: 'No active workspace found' });
    }

    const graphStore = GraphStore.get(root);
    const activeEp = store.getActiveEpisode(root);

    if (args?.scope === 'project' || !activeEp) {
      return JSON.stringify(graphStore.getGraph(), null, 2);
    }

    const subgraph = graphStore.getEpisodeSubgraph(activeEp.id);
    return JSON.stringify({
      episodeId: activeEp.id,
      episodeName: activeEp.name,
      ...subgraph
    }, null, 2);
  }
};

const logDecisionTool: McpToolDefinition = {
  name: 'contextlens_log_decision',
  description: 'Log an architectural design choice, rejected alternative, or technical decision to ContextLens graph',
  version: '1.0.0',
  category: 'memory',
  inputSchema: {
    type: 'object',
    properties: {
      decision: {
        type: 'string',
        description: 'Summary of the decision or architectural intent'
      },
      rationale: {
        type: 'string',
        description: 'Why this choice was made over alternatives'
      },
      alternatives: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of alternatives that were considered and rejected'
      }
    },
    required: ['decision']
  },
  permissions: [McpPermission.WRITE],
  handler: async (args, _context) => {
    const store = EpisodeStore.get();
    const root = store.getActiveWorkspaceRoot();
    if (!root) {
      return JSON.stringify({ error: 'No active workspace found' });
    }

    if (!args?.decision) {
      return JSON.stringify({ error: 'Missing required field: decision' });
    }

    const graphStore = GraphStore.get(root);
    const activeEp = store.getActiveEpisode(root);

    const node = graphStore.logDecision(args.decision, activeEp?.id, {
      rationale: args.rationale,
      alternatives: args.alternatives,
      recordedBy: 'mcp'
    });

    return JSON.stringify({
      ok: true,
      message: 'Decision logged into ContextLens graph',
      node
    }, null, 2);
  }
};

ToolRegistry.getInstance().register(getGraphTool);
ToolRegistry.getInstance().register(logDecisionTool);

export { getGraphTool, logDecisionTool };
