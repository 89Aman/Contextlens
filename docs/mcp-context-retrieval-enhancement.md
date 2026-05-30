# ContextLens MCP Server Enhancement Plan

## Context
The user wants to enhance the ContextLens MCP server so that when users lose context in their AI conversations, the AI can automatically call the ContextLens MCP server to retrieve past built features/context.

Currently, the MCP server provides tools for managing episodes (start/close), logging AI calls, getting status, and explaining current diffs. However, it lacks tools for retrieving past context, which is needed when AI assistants lose conversation context and need to recall previously built features or coding sessions.

## Current Implementation
The ContextLens MCP implementation consists of:
1. **VS Code Extension MCP Server** (`vscode-extension/src/mcpServer.ts`): HTTP server on port 3012 with 5 tools
2. **MCP Bridge** (`vscode-extension/mcp-bridge.js`): Translates stdio JSON-RPC to HTTP requests
3. **CLI MCP Command** (`cli/index.js`): Direct stdio MCP server talking to backend API
4. **Backend API** (`src/routes/api.js`): Firebase-based storage with episodes, calls, and search functionality

Existing backend capabilities:
- Episodes store metadata: label, branch, timestamps, changed files, etc.
- Calls store AI interactions: prompts, responses, models, etc.
- `/search` endpoint enables text search across episodes and calls
- User data is isolated by Firebase auth (`users/{uid}/projects/{projectId}/...`)

## Enhancement Goal
Add MCP tools that enable AI assistants to retrieve past context when they lose conversation context, specifically:
1. Search for past episodes by topic/content
2. Get summaries of past episodes
3. Retrieve detailed episode information including associated AI calls
4. Get explanations of past code changes

## Recommended Approach
Enhance the MCP server in three places to maintain consistency:
1. **VS Code Extension MCP Server** (`mcpServer.ts`): Add new HTTP endpoints
2. **MCP Bridge** (`mcp-bridge.js`): Expose new tools via stdio
3. **CLI MCP Command** (`cli/index.js`): Add new tools talking to backend API

Leverage existing backend functionality where possible:
- Use existing `/search` endpoint for search capabilities
- Potentially add new backend endpoints for episode listing/details if needed
- Reuse existing authentication and validation patterns

## New MCP Tools to Add

### 1. search_context
Search for past episodes and AI calls by topic or content
- **Parameters**: 
  - `query`: string (search text)
  - `limit`: number (optional, default 10)
- **Returns**: Matching episodes and calls with relevant metadata
- **Backend**: Use existing `/search` endpoint

### 2. get_episode_details
Get detailed information about a specific episode
- **Parameters**:
  - `episodeId`: string
- **Returns**: Episode metadata, associated calls, and summary statistics
- **Backend**: May need new endpoint or extend existing episode retrieval

### 3. get_recent_episodes
Get recently accessed/modified episodes
- **Parameters**:
  - `limit`: number (optional, default 5)
  - `includeClosed`: boolean (optional, default false)
- **Returns**: List of recent episodes with basic metadata
- **Backend**: May need new endpoint for listing episodes

### 4. explain_past_changes
Get AI explanation of changes in a past episode
- **Parameters**:
  - `episodeId`: string
- **Returns**: AI-generated summary, risks, and suggested checks for the episode
- **Backend**: Use existing `/episodes/explain` endpoint with episode's diff hash

## Implementation Details

### Backend Enhancements (if needed)
If existing endpoints don't provide sufficient data, consider adding:
1. `GET /episodes/list` - List episodes for a project with pagination
2. `GET /episodes/{episodeId}` - Get episode details (currently only available via verification in routes)
3. `GET /episodes/{episodeId}/calls` - Get calls for a specific episode

However, looking at the existing code, much of this data can be retrieved by extending the search or using existing patterns.

### VS Code Extension Changes
1. **mcpServer.ts**: Add new route handlers for the new endpoints
2. **mcp-bridge.js**: Add new tool cases in the switch statements for both `tools/list` and `tools/call`

### CLI Changes
1. **cli/index.js**: Add new tool cases in the MCP stdio server's switch statements

### Authentication & Security
All new tools must:
- Require proper Firebase authentication (reuse `requireAuth` middleware)
- Validate ownership of projects/episodes (reuse `verifyProjectOwnership`/`verifyEpisodeOwnership`)
- Follow existing input validation patterns
- Respect user data isolation

## Files to Modify

### 1. Backend (Optional - if new endpoints needed)
- `src/routes/api.js`: Add new route handlers for episode listing/details
- `src/middleware/validate.js`: Add validation schemas for new endpoints

### 2. VS Code Extension
- `vscode-extension/src/mcpServer.ts`: Add new HTTP route handlers
- `vscode-extension/mcp-bridge.js`: Add new tool definitions and handlers

### 3. CLI
- `cli/index.js`: Add new MCP tool definitions and handlers

## Verification Plan
To verify the enhancements work correctly:

1. **Unit Tests**: Test new MCP tool handlers with mock data
2. **Integration Tests**: 
   - Start MCP server and test stdio communication
   - Verify tools return expected data structures
   - Test authentication requirements
3. **Manual Testing**:
   - Use Claude Desktop/Cursor with ContextLens MCP configured
   - Test search_context tool to find past episodes
   - Get_episode_details to retrieve specific episode info
   - Test get_recent_episodes to see recent work
   - Test explain_past_changes on past episodes
4. **End-to-End Scenario**:
   - Create several coding episodes with different topics
   - In a new AI conversation, use MCP tools to search for past work on a specific topic
   - Retrieve details and verify the AI can reconstruct context

## Dependencies
- No new external dependencies required
- Uses existing Firebase, express, and AI service infrastructure
- Reuses existing authentication and validation middleware

## Future Considerations
- Add pagination to search results for large datasets
- Implement more sophisticated search (full-text search, filtering by date/source)
- Add caching for frequently accessed episode data
- Consider adding tools to export episode context for external use