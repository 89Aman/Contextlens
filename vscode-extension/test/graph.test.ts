import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Pass1Extractor } from '../src/graph/extractor';
import { GraphStore } from '../src/graph/graphStore';

describe('Pass1Extractor', () => {
  it('should extract TypeScript functions, classes, and types', () => {
    const tsCode = `
export class AuthService {
  async login(user: string): Promise<boolean> { return true; }
}
export function verifyToken(token: string) { return true; }
export const hashPassword = async (pwd: string) => { return pwd; };
export interface UserPayload { id: string; }
export type AuthState = 'in' | 'out';
`;
    const symbols = Pass1Extractor.extractSymbolsFromFile('src/auth.ts', tsCode);
    if (!symbols.includes('AuthService')) throw new Error('Missing AuthService');
    if (!symbols.includes('verifyToken')) throw new Error('Missing verifyToken');
    if (!symbols.includes('hashPassword')) throw new Error('Missing hashPassword');
    if (!symbols.includes('UserPayload')) throw new Error('Missing UserPayload');
    if (!symbols.includes('AuthState')) throw new Error('Missing AuthState');
  });

  it('should extract Python defs and classes', () => {
    const pyCode = `
class DataPipeline:
    def __init__(self): pass

async def fetch_records(url):
    return []
`;
    const symbols = Pass1Extractor.extractSymbolsFromFile('pipeline.py', pyCode);
    if (!symbols.includes('DataPipeline')) throw new Error('Missing DataPipeline');
    if (!symbols.includes('fetch_records')) throw new Error('Missing fetch_records');
  });

  it('should extract Go functions and structs', () => {
    const goCode = `
type Server struct {}
func (s *Server) Start() error { return nil }
func NewServer() *Server { return &Server{} }
`;
    const symbols = Pass1Extractor.extractSymbolsFromFile('server.go', goCode);
    if (!symbols.includes('Server')) throw new Error('Missing Server');
    if (!symbols.includes('Start')) throw new Error('Missing Start');
    if (!symbols.includes('NewServer')) throw new Error('Missing NewServer');
  });

  it('should generate EXTRACTED nodes and edges on file save', () => {
    const result = Pass1Extractor.extractFromFileSave(
      'src/utils.ts',
      'export function helper() { return 42; }',
      'ep_123'
    );

    const fileNode = result.nodes.find(n => n.type === 'file');
    const symNode = result.nodes.find(n => n.type === 'symbol');
    if (!fileNode || fileNode.label !== 'src/utils.ts') throw new Error('Invalid file node');
    if (!symNode || symNode.label !== 'helper') throw new Error('Invalid symbol node');

    const modifiesEdge = result.edges.find(e => e.relation === 'modifies');
    const definesEdge = result.edges.find(e => e.relation === 'defines');
    if (!modifiesEdge || modifiesEdge.confidence !== 'EXTRACTED') throw new Error('Invalid modifies edge');
    if (!definesEdge || definesEdge.confidence !== 'EXTRACTED') throw new Error('Invalid defines edge');
  });

  it('should generate commit nodes on git commit and extract commit body decision', () => {
    const commitMsg = `feat(auth): implement token validation\n\nSwitched from RSA to Ed25519 for faster signature verification.`;
    const result = Pass1Extractor.extractFromCommit(
      commitMsg,
      ['src/auth.ts'],
      'ep_123'
    );
    const commitNode = result.nodes.find(n => n.type === 'commit');
    if (!commitNode || !commitNode.label.includes('feat(auth)')) throw new Error('Invalid commit node');

    const decisionNode = result.nodes.find(n => n.type === 'decision');
    if (!decisionNode || !decisionNode.label.includes('Switched from RSA')) {
      throw new Error('Commit body decision was not extracted');
    }
  });

  it('should extract intent comments (WHY, DECISION) as decision nodes on file save', () => {
    const code = `
// WHY: Avoid race condition when updating user balance
export function updateBalance() {}

/* DECISION: Use AES-256-GCM for payload encryption */
export function encrypt() {}
`;
    const result = Pass1Extractor.extractFromFileSave('src/wallet.ts', code, 'ep_123');
    const decisions = result.nodes.filter(n => n.type === 'decision');
    if (decisions.length !== 2) {
      throw new Error(`Expected 2 decision nodes from comments, got ${decisions.length}`);
    }
    const whyNode = decisions.find(d => d.label.includes('WHY:'));
    const decNode = decisions.find(d => d.label.includes('DECISION:'));
    if (!whyNode || !decNode) throw new Error('Missing specific intent comment decisions');
  });
});

describe('GraphStore', () => {
  const tempDir = path.join(os.tmpdir(), `cl_test_${Date.now()}`);

  beforeEach(() => {
    GraphStore.clearInstances();
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    GraphStore.clearInstances();
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it('should initialize empty graph in .contextlens directory', () => {
    const store = GraphStore.get(tempDir);
    const graph = store.getGraph();
    if (!Array.isArray(graph.nodes)) throw new Error('Nodes should be array');
    if (!Array.isArray(graph.edges)) throw new Error('Edges should be array');
    if (!fs.existsSync(path.join(tempDir, '.contextlens', 'graph.json'))) {
      throw new Error('graph.json was not created');
    }
  });

  it('should add nodes, edges, and retrieve episode subgraph', () => {
    const store = GraphStore.get(tempDir);
    const epId = 'ep_alpha';

    store.addNode({
      id: epId,
      label: 'Alpha Episode',
      type: 'episode',
      timestamp: Date.now()
    });

    store.addNode({
      id: 'file:main.ts',
      label: 'main.ts',
      type: 'file',
      sourceEpisode: epId,
      timestamp: Date.now()
    });

    store.addEdge({
      source: epId,
      target: 'file:main.ts',
      relation: 'modifies',
      confidence: 'EXTRACTED',
      confidenceScore: 1.0,
      sourceEpisode: epId
    });

    const decisionNode = store.logDecision('Switched to Argon2', epId, { rationale: 'Better security' });
    if (!decisionNode || decisionNode.type !== 'decision') throw new Error('Failed to log decision');

    const subgraph = store.getEpisodeSubgraph(epId);
    if (subgraph.nodes.length < 3) throw new Error(`Expected at least 3 nodes, got ${subgraph.nodes.length}`);
    if (subgraph.edges.length < 2) throw new Error(`Expected at least 2 edges, got ${subgraph.edges.length}`);
  });

  it('should compact episode symbols to archive while retaining decisions and files', () => {
    const store = GraphStore.get(tempDir);
    const epId = 'ep_to_close';

    store.addNode({ id: epId, label: 'Close Test', type: 'episode', timestamp: Date.now() });
    store.addNode({ id: 'file:auth.ts', label: 'auth.ts', type: 'file', sourceEpisode: epId, timestamp: Date.now() });
    store.addNode({ id: 'sym:auth.ts#login', label: 'login', type: 'symbol', sourceEpisode: epId, timestamp: Date.now() });
    store.addNode({ id: 'sym:auth.ts#logout', label: 'logout', type: 'symbol', sourceEpisode: epId, timestamp: Date.now() });
    store.addNode({ id: 'decision:123', label: 'Use sessions', type: 'decision', sourceEpisode: epId, timestamp: Date.now() });

    store.addEdge({ source: epId, target: 'file:auth.ts', relation: 'modifies', confidence: 'EXTRACTED', confidenceScore: 1.0, sourceEpisode: epId });
    store.addEdge({ source: 'file:auth.ts', target: 'sym:auth.ts#login', relation: 'defines', confidence: 'EXTRACTED', confidenceScore: 1.0, sourceEpisode: epId });
    store.addEdge({ source: 'file:auth.ts', target: 'sym:auth.ts#logout', relation: 'defines', confidence: 'EXTRACTED', confidenceScore: 1.0, sourceEpisode: epId });

    const compaction = store.compactEpisodeSymbols(epId);
    if (compaction.prunedSymbols !== 2) throw new Error(`Expected 2 pruned symbols, got ${compaction.prunedSymbols}`);

    const graph = store.getGraph();
    const remainingSyms = graph.nodes.filter(n => n.type === 'symbol');
    if (remainingSyms.length !== 0) throw new Error('Symbols were not pruned from active graph');

    const remainingDecisions = graph.nodes.filter(n => n.type === 'decision');
    if (remainingDecisions.length !== 1) throw new Error('Decisions should be retained in active graph');

    const remainingFiles = graph.nodes.filter(n => n.type === 'file');
    if (remainingFiles.length !== 1) throw new Error('Files should be retained in active graph');

    const archiveFile = path.join(tempDir, '.contextlens', 'archive', `${epId}.json`);
    if (!fs.existsSync(archiveFile)) throw new Error('Archive file was not created');
    const archiveData = JSON.parse(fs.readFileSync(archiveFile, 'utf8'));
    if (archiveData.nodes.length !== 2) throw new Error(`Archive should contain 2 symbol nodes, got ${archiveData.nodes.length}`);
  });
});
