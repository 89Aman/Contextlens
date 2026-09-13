import * as fs from 'fs';
import * as path from 'path';

export type NodeType = 'file' | 'symbol' | 'decision' | 'concept' | 'commit' | 'episode';
export type EdgeConfidence = 'EXTRACTED' | 'INFERRED' | 'AMBIGUOUS';

export interface GraphNode {
  id: string;
  label: string;
  type: NodeType;
  sourceEpisode?: string;
  metadata?: Record<string, any>;
  timestamp: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  relation: string;
  confidence: EdgeConfidence;
  confidenceScore: number;
  sourceEpisode?: string;
}

export interface ProjectGraph {
  version: string;
  updatedAt: number;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export class GraphStore {
  private static instances = new Map<string, GraphStore>();
  private graphPath: string;
  private graphDir: string;
  private graph: ProjectGraph = {
    version: '1.0.0',
    updatedAt: Date.now(),
    nodes: [],
    edges: []
  };

  private constructor(private workspaceRoot: string) {
    this.graphDir = path.join(workspaceRoot, '.contextlens');
    this.graphPath = path.join(this.graphDir, 'graph.json');
    this.ensureDirectoryAndIgnore();
    this.load();
  }

  public static get(workspaceRoot: string): GraphStore {
    let instance = this.instances.get(workspaceRoot);
    if (!instance) {
      instance = new GraphStore(workspaceRoot);
      this.instances.set(workspaceRoot, instance);
    }
    return instance;
  }

  public static clearInstances(): void {
    this.instances.clear();
  }

  private ensureDirectoryAndIgnore(): void {
    try {
      if (!fs.existsSync(this.graphDir)) {
        fs.mkdirSync(this.graphDir, { recursive: true });
      }
      const gitignorePath = path.join(this.workspaceRoot, '.gitignore');
      if (fs.existsSync(gitignorePath)) {
        const content = fs.readFileSync(gitignorePath, 'utf8');
        if (!content.includes('.contextlens')) {
          fs.appendFileSync(gitignorePath, '\n# ContextLens local store\n.contextlens/\n');
        }
      }
    } catch (err) {
      console.error('[ContextLens] Failed to init .contextlens directory:', err);
    }
  }

  public load(): ProjectGraph {
    try {
      if (fs.existsSync(this.graphPath)) {
        const raw = fs.readFileSync(this.graphPath, 'utf8');
        this.graph = JSON.parse(raw);
      } else {
        this.save();
      }
    } catch (err) {
      console.error('[ContextLens] Error loading graph.json, resetting empty graph:', err);
      this.graph = { version: '1.0.0', updatedAt: Date.now(), nodes: [], edges: [] };
    }
    return this.graph;
  }

  public save(): void {
    try {
      if (!fs.existsSync(this.graphDir)) {
        fs.mkdirSync(this.graphDir, { recursive: true });
      }
      this.graph.updatedAt = Date.now();
      fs.writeFileSync(this.graphPath, JSON.stringify(this.graph, null, 2), 'utf8');
    } catch (err) {
      console.error('[ContextLens] Error saving graph.json:', err);
    }
  }

  public addNode(node: GraphNode): void {
    const existingIndex = this.graph.nodes.findIndex(n => n.id === node.id);
    if (existingIndex >= 0) {
      this.graph.nodes[existingIndex] = {
        ...this.graph.nodes[existingIndex],
        ...node,
        metadata: { ...this.graph.nodes[existingIndex].metadata, ...node.metadata }
      };
    } else {
      this.graph.nodes.push(node);
    }
  }

  public addNodes(nodes: GraphNode[]): void {
    for (const node of nodes) {
      this.addNode(node);
    }
  }

  public addEdge(edge: GraphEdge): void {
    const exists = this.graph.edges.some(
      e => e.source === edge.source && e.target === edge.target && e.relation === edge.relation
    );
    if (!exists) {
      this.graph.edges.push(edge);
    }
  }

  public addEdges(edges: GraphEdge[]): void {
    for (const edge of edges) {
      this.addEdge(edge);
    }
  }

  public getGraph(): ProjectGraph {
    return this.graph;
  }

  public getEpisodeSubgraph(episodeId: string): { nodes: GraphNode[]; edges: GraphEdge[] } {
    const episodeEdges = this.graph.edges.filter(e => e.sourceEpisode === episodeId || e.source === episodeId || e.target === episodeId);
    const nodeIds = new Set<string>();
    nodeIds.add(episodeId);

    for (const edge of episodeEdges) {
      nodeIds.add(edge.source);
      nodeIds.add(edge.target);
    }

    const episodeNodes = this.graph.nodes.filter(n => nodeIds.has(n.id) || n.sourceEpisode === episodeId);
    return {
      nodes: episodeNodes,
      edges: episodeEdges
    };
  }

  public logDecision(label: string, episodeId?: string, metadata?: Record<string, any>): GraphNode {
    const id = `decision_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const node: GraphNode = {
      id,
      label,
      type: 'decision',
      sourceEpisode: episodeId,
      metadata,
      timestamp: Date.now()
    };
    this.addNode(node);

    if (episodeId) {
      this.addEdge({
        source: episodeId,
        target: id,
        relation: 'decided',
        confidence: 'EXTRACTED',
        confidenceScore: 1.0,
        sourceEpisode: episodeId
      });
    }

    this.save();
    return node;
  }

  /**
   * Compacts an episode upon closure:
   * Moves leaf symbol nodes (`sym:*`) belonging to this episode into .contextlens/archive/<episodeId>.json.
   * Keeps episode node, file nodes, and decision nodes in active graph.json.
   * Prunes dangling defines edges.
   */
  public compactEpisodeSymbols(closedEpisodeId: string): { prunedSymbols: number } {
    try {
      const archiveDir = path.join(this.graphDir, 'archive');
      if (!fs.existsSync(archiveDir)) {
        fs.mkdirSync(archiveDir, { recursive: true });
      }

      const symbolsToArchive = this.graph.nodes.filter(
        n => n.type === 'symbol' && n.sourceEpisode === closedEpisodeId
      );

      if (symbolsToArchive.length === 0) {
        return { prunedSymbols: 0 };
      }

      const symbolIds = new Set(symbolsToArchive.map(s => s.id));
      const edgesToArchive = this.graph.edges.filter(
        e => symbolIds.has(e.source) || symbolIds.has(e.target)
      );

      const archivePath = path.join(archiveDir, `${closedEpisodeId}.json`);
      const archiveData = {
        episodeId: closedEpisodeId,
        archivedAt: Date.now(),
        nodes: symbolsToArchive,
        edges: edgesToArchive
      };
      fs.writeFileSync(archivePath, JSON.stringify(archiveData, null, 2), 'utf8');

      this.graph.nodes = this.graph.nodes.filter(n => !symbolIds.has(n.id));
      this.graph.edges = this.graph.edges.filter(
        e => !symbolIds.has(e.source) && !symbolIds.has(e.target)
      );

      this.save();
      return { prunedSymbols: symbolsToArchive.length };
    } catch (err) {
      console.error('[ContextLens] Failed to compact episode symbols:', err);
      return { prunedSymbols: 0 };
    }
  }
}
