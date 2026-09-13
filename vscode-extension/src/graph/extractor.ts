import * as path from 'path';
import { GraphNode, GraphEdge } from './graphStore';

export interface ExtractorResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export class Pass1Extractor {
  /**
   * Deterministically extract symbols from file content based on extension.
   */
  public static extractSymbolsFromFile(filePath: string, content: string): string[] {
    const ext = path.extname(filePath).toLowerCase();
    const symbols = new Set<string>();

    switch (ext) {
      case '.ts':
      case '.tsx':
      case '.js':
      case '.jsx': {
        // Functions: function foo( or export function foo(
        const fnMatches = content.matchAll(/(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_$]+)\s*\(/g);
        for (const m of fnMatches) if (m[1]) symbols.add(m[1]);

        // Arrow / assigned functions: const foo = (...) => or const foo = function
        const arrowMatches = content.matchAll(/(?:export\s+)?(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[a-zA-Z0-9_$]+)\s*=>/g);
        for (const m of arrowMatches) if (m[1]) symbols.add(m[1]);

        // Classes: class Foo
        const classMatches = content.matchAll(/(?:export\s+)?class\s+([a-zA-Z0-9_$]+)/g);
        for (const m of classMatches) if (m[1]) symbols.add(m[1]);

        // Interfaces / Types: interface Foo or type Foo
        const typeMatches = content.matchAll(/(?:export\s+)?(?:interface|type)\s+([a-zA-Z0-9_$]+)/g);
        for (const m of typeMatches) if (m[1]) symbols.add(m[1]);
        break;
      }

      case '.py': {
        // def foo( or async def foo(
        const pyFnMatches = content.matchAll(/(?:async\s+)?def\s+([a-zA-Z0-9_]+)\s*\(/g);
        for (const m of pyFnMatches) if (m[1]) symbols.add(m[1]);

        // class Foo:
        const pyClassMatches = content.matchAll(/class\s+([a-zA-Z0-9_]+)(?:\([^)]*\))?:/g);
        for (const m of pyClassMatches) if (m[1]) symbols.add(m[1]);
        break;
      }

      case '.go': {
        // func Foo( or func (r *Receiver) Foo(
        const goFnMatches = content.matchAll(/func\s+(?:\([^)]*\)\s+)?([a-zA-Z0-9_]+)\s*\(/g);
        for (const m of goFnMatches) if (m[1]) symbols.add(m[1]);

        // type Foo struct/interface
        const goTypeMatches = content.matchAll(/type\s+([a-zA-Z0-9_]+)\s+(?:struct|interface)/g);
        for (const m of goTypeMatches) if (m[1]) symbols.add(m[1]);
        break;
      }

      case '.rs': {
        // fn foo( or pub fn foo(
        const rsFnMatches = content.matchAll(/(?:pub\s+)?(?:async\s+)?fn\s+([a-zA-Z0-9_]+)\s*\(/g);
        for (const m of rsFnMatches) if (m[1]) symbols.add(m[1]);

        // struct Foo or enum Foo
        const rsTypeMatches = content.matchAll(/(?:pub\s+)?(?:struct|enum|trait)\s+([a-zA-Z0-9_]+)/g);
        for (const m of rsTypeMatches) if (m[1]) symbols.add(m[1]);
        break;
      }

      case '.java':
      case '.cs': {
        // public void foo( or private async Task foo(
        const oopFnMatches = content.matchAll(/(?:public|protected|private|static|\s)+[\w<>\[\]]+\s+([a-zA-Z0-9_]+)\s*\([^)]*\)\s*\{/g);
        for (const m of oopFnMatches) {
          if (m[1] && !['if', 'for', 'while', 'switch', 'catch'].includes(m[1])) {
            symbols.add(m[1]);
          }
        }
        const oopClassMatches = content.matchAll(/(?:public|protected|private|\s)+class\s+([a-zA-Z0-9_]+)/g);
        for (const m of oopClassMatches) if (m[1]) symbols.add(m[1]);
        break;
      }

      default:
        break;
    }

    return Array.from(symbols);
  }

  /**
   * Deterministically extract intent comments (WHY:, DECISION:, NOTE:, REFACTOR:, ARCH:, FIX:)
   */
  public static extractIntentComments(content: string): Array<{ tag: string; text: string }> {
    const results: Array<{ tag: string; text: string }> = [];
    const commentRegex = /(?:\/\/|#|\/\*)\s*(WHY|DECISION|REFACTOR|NOTE|ARCH|FIX):\s*([^\r\n*]+)/gi;
    for (const match of content.matchAll(commentRegex)) {
      if (match[1] && match[2]) {
        const text = match[2].trim().replace(/\*\/$/, '').trim();
        if (text.length > 3) {
          results.push({ tag: match[1].toUpperCase(), text });
        }
      }
    }
    return results;
  }

  /**
   * Deterministically extract nodes & edges from a modified file event.
   */
  public static extractFromFileSave(
    relativeFilePath: string,
    fileContent: string,
    episodeId?: string
  ): ExtractorResult {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const now = Date.now();

    const fileNodeId = `file:${relativeFilePath}`;
    nodes.push({
      id: fileNodeId,
      label: relativeFilePath,
      type: 'file',
      sourceEpisode: episodeId,
      timestamp: now
    });

    if (episodeId) {
      edges.push({
        source: episodeId,
        target: fileNodeId,
        relation: 'modifies',
        confidence: 'EXTRACTED',
        confidenceScore: 1.0,
        sourceEpisode: episodeId
      });
    }

    const symbols = this.extractSymbolsFromFile(relativeFilePath, fileContent);
    for (const sym of symbols) {
      const symNodeId = `sym:${relativeFilePath}#${sym}`;
      nodes.push({
        id: symNodeId,
        label: sym,
        type: 'symbol',
        sourceEpisode: episodeId,
        metadata: { file: relativeFilePath },
        timestamp: now
      });

      edges.push({
        source: fileNodeId,
        target: symNodeId,
        relation: 'defines',
        confidence: 'EXTRACTED',
        confidenceScore: 1.0,
        sourceEpisode: episodeId
      });
    }

    // Extract intent comments as decisions
    const intentComments = this.extractIntentComments(fileContent);
    for (const comment of intentComments) {
      const decisionId = `decision:comment_${now}_${Math.random().toString(36).slice(2, 6)}`;
      nodes.push({
        id: decisionId,
        label: `${comment.tag}: ${comment.text}`,
        type: 'decision',
        sourceEpisode: episodeId,
        metadata: {
          tag: comment.tag,
          file: relativeFilePath,
          rationale: comment.text,
          source: 'code_comment'
        },
        timestamp: now
      });

      if (episodeId) {
        edges.push({
          source: episodeId,
          target: decisionId,
          relation: 'decided',
          confidence: 'EXTRACTED',
          confidenceScore: 1.0,
          sourceEpisode: episodeId
        });
      }
    }

    return { nodes, edges };
  }

  /**
   * Deterministically extract nodes & edges from git commit info.
   */
  public static extractFromCommit(
    commitMessage: string,
    changedFiles: string[],
    episodeId?: string
  ): ExtractorResult {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const now = Date.now();

    const lines = commitMessage.split('\n').map(l => l.trim()).filter(l => !l.startsWith('#'));
    const subject = lines[0] || 'Commit';

    const commitId = `commit:${now}_${Math.random().toString(36).slice(2, 6)}`;
    nodes.push({
      id: commitId,
      label: subject.slice(0, 80),
      type: 'commit',
      sourceEpisode: episodeId,
      metadata: { fullMessage: commitMessage },
      timestamp: now
    });

    if (episodeId) {
      edges.push({
        source: episodeId,
        target: commitId,
        relation: 'contains_commit',
        confidence: 'EXTRACTED',
        confidenceScore: 1.0,
        sourceEpisode: episodeId
      });
    }

    for (const f of changedFiles) {
      const fileNodeId = `file:${f}`;
      edges.push({
        source: commitId,
        target: fileNodeId,
        relation: 'modifies',
        confidence: 'EXTRACTED',
        confidenceScore: 1.0,
        sourceEpisode: episodeId
      });
    }

    // Extract body paragraph as a decision if present
    if (lines.length > 1) {
      const bodyLines = lines.slice(1).filter(l => l.length > 0);
      if (bodyLines.length > 0) {
        const bodyText = bodyLines.join(' ');
        if (bodyText.length > 5) {
          const decisionId = `decision:commit_${now}_${Math.random().toString(36).slice(2, 6)}`;
          nodes.push({
            id: decisionId,
            label: bodyText.slice(0, 100),
            type: 'decision',
            sourceEpisode: episodeId,
            metadata: {
              source: 'commit_body',
              commitSubject: subject,
              rationale: bodyText
            },
            timestamp: now
          });

          if (episodeId) {
            edges.push({
              source: episodeId,
              target: decisionId,
              relation: 'decided',
              confidence: 'EXTRACTED',
              confidenceScore: 1.0,
              sourceEpisode: episodeId
            });
          }
        }
      }
    }

    return { nodes, edges };
  }
}
