# Example: Semantic Search

Search your past coding sessions for relevant context. Two modes are available
through the `search_context` tool:

- **text** (default): substring match over episodes and calls.
- **semantic**: vector similarity over embedded prompts/responses. Requires the
  project to be indexed first (see below).

## Usage

### Search Past Episodes (text mode)

Ask your AI client:

```
Search my past work for anything related to "database migration" 
using search_context
```

Tool call:

```json
{
  "name": "search_context",
  "arguments": {
    "query": "database migration"
  }
}
```

### Index a project for semantic search

Semantic search needs embeddings. Indexing is a manual trigger (AI cost is
user-controlled). From the dashboard or any authenticated client:

```bash
curl -X POST $API/api/search/index \
  -H "Authorization: Bearer $ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "projectId": "<projectId>" }'
```

Re-index a single episode: `{ "projectId": "<id>", "episodeId": "<id>", "force": true }`.

### Semantic search

Ask your AI client:

```
Use search_context with mode semantic to find work related to "ORM schema design"
```

Tool call:

```json
{
  "name": "search_context",
  "arguments": {
    "query": "ORM schema design",
    "mode": "semantic"
  }
}
```

Semantic results include a relevance `score`; low scores (`< 0.3`) are filtered
out.

### Expected Output

```
Search Results for "database migration":

1. Episode: "Migrate to PostgreSQL" (2 days ago)
   - Changed 8 files
   - Key changes: Added migration scripts, updated ORM config
   - AI interactions: 3 calls discussing schema design

2. Episode: "Add user table" (1 week ago)
   - Changed 4 files
   - Key changes: Created users table, added indexes
   - AI interactions: 1 call about column types
```

### Use Cases

- **Onboarding**: "What has been done on the payment system?"
- **Bug investigation**: "Show me recent changes to the auth module"
- **Knowledge retrieval**: "How did we handle rate limiting before?"
- **Code review prep**: "What episodes touched this file?"
