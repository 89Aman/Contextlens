# ContextLens — Conversation Graph Feature Idea

## Goal

Extend ContextLens so that every AI conversation captured in a project is turned into a small graph (nodes + edges), instead of being summarized by a single raw LLM prompt. The accumulated graph across all conversations is then used to automatically **name episodes** and **build up context** for each one, borrowing the architecture from the `graphify` tool.

## Why

Right now, episode naming and context likely rely on the LLM re-reading raw conversation/diff text each time. This is:
- Expensive in tokens as the number of episodes grows.
- Inconsistent — no shared structure linking related episodes together.
- Missing a way to say *how confident* a name/label actually is.

A persistent, queryable graph fixes all three: it accumulates knowledge over time, is cheap to query compared to re-reading transcripts, and can carry confidence metadata on every relationship.

## Core Design — Three Passes Per Conversation

**Pass 1 — Structural extraction (free, local, no LLM)**
- Parse the conversation + its paired diff deterministically.
- Extract: file paths mentioned, function/class/symbol names (cross-referenced with Tree-sitter parsing of the diff), timestamps.
- Output: `EXTRACTED` nodes/edges, confidence = 1.0, zero token cost.

**Pass 2 — (optional, future) Audio/video**
- If voice notes or recorded walkthroughs of a session are ever added, transcribe locally (e.g. faster-whisper) and feed into Pass 3.
- Not needed for MVP.

**Pass 3 — Semantic extraction (LLM subagent, costs tokens)**
- An LLM reads the conversation text and outputs a JSON fragment: nodes (concepts, decisions, intents — e.g. "switched from JWT to session cookies") and edges (`implements`, `fixes`, `refactors`, `discusses`).
- Critically: also generates `semantically_similar_to` edges linking this conversation's nodes to nodes from **past** episodes' graphs already stored — this is how cross-episode context accumulates instead of resetting each time.

## Confidence Tagging

Reuse a three-tier scheme for every relationship/label:

| Tag | Meaning | Example |
|---|---|---|
| `EXTRACTED` | Found directly in source (file path, explicit commit ref) | Always confidence 1.0 |
| `INFERRED` | LLM's reasonable inference | Confidence score 0.55–0.95 based on evidence strength |
| `AMBIGUOUS` | Uncertain, needs manual review | Flagged in a report |

Episode auto-names derived from `EXTRACTED` data are trusted; names derived purely from `INFERRED` conversational intent get a confidence score and can be surfaced for manual confirmation if low.

## Efficiency Techniques to Port from Graphify

- **SHA256 caching**: hash each conversation transcript; skip re-extraction on retries/crashes/unchanged content.
- **Local-first processing**: never send unchanged file/code content to the LLM twice — only the actual delta.
- **Graph-based token compaction**: once the graph exists, querying it for context/naming is far cheaper than re-reading raw conversation history for every new episode. Savings compound as the number of episodes grows.
- **Parallel extraction**: if multiple files/conversations close out around the same time, run Pass 1 extraction concurrently (e.g. via a process pool) rather than sequentially.
- **Community detection (later stage)**: once enough episodes exist, run a graph-clustering algorithm (e.g. Leiden) over the accumulated graph so episodes naturally group into workstreams/features (e.g. all "auth" episodes cluster together) without manual tagging. Not worth adding until there's a meaningful number of episodes.

## Data Format

Reuse a simple node-link JSON structure per project:

- **Node**: `id`, `label`, `type` (`file`, `symbol`, `concept`, `decision`), `source_conversation`
- **Edge**: `source`, `target`, `relation` (verb phrase), `confidence` (`EXTRACTED`/`INFERRED`/`AMBIGUOUS`), `confidence_score` (if INFERRED), `source_conversation`

Store as a single running `graph.json` per project, updated after each conversation/episode closes.

## Build Order (MVP → later)

1. **Pass 1 local extractor** — pull file/symbol mentions from conversation + diff pair. No LLM, no cost.
2. **Pass 3 LLM subagent** — output a JSON graph fragment per conversation; merge into the project's running graph.
3. **Similarity linking** — use `semantically_similar_to` edges against the accumulated graph to auto-suggest episode names and pull related past context into new PR descriptions/summaries.
4. **Confidence-based review UI** — surface low-confidence (`INFERRED`/`AMBIGUOUS`) episode names for quick manual confirmation.
5. **Clustering (later)** — add Leiden-based grouping once there are enough episodes for it to add value.

## Open Questions to Resolve Next

- Where does Pass 1 hook into the existing diff-watcher — same event that currently triggers episode creation?
- Should the per-project `graph.json` live locally in the workspace (like graphify's `graphify-out/`) or sync to a backend if ContextLens ever becomes multi-device?
- What's the batch/debounce strategy for Pass 3 calls — per conversation turn, or only when an episode is closed?
