/**
 * Embeddings utilities for semantic search.
 *
 * Provider-agnostic text embedding with Gemini (Vertex or Generative AI) and
 * OpenAI. Keeps the "AI is manual-trigger" principle: embedding generation is
 * only invoked from explicit user actions (POST /search/index).
 */

const { redactText } = require('./redaction');

const project = process.env.GCP_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;
const location = process.env.VERTEX_LOCATION || 'us-central1';

const MAX_INPUT_CHARS = 8000;

/** Approximate cosine similarity in [-1, 1]. Empty vectors → 0. */
function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Embed a single text string.
 *
 * @param {string} text
 * @param {{provider?: string, customApiKey?: string, model?: string}} [options]
 * @returns {Promise<{vector: number[], model: string}>}
 */
async function embedText(text, options = {}) {
  const provider = options.provider || 'gemini';
  const sanitized = redactText(text || '').slice(0, MAX_INPUT_CHARS);
  if (!sanitized) throw new Error('Nothing to embed');

  if (provider === 'openai') {
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: options.customApiKey });
    const model = options.model || 'text-embedding-3-small';
    const res = await openai.embeddings.create({ model, input: sanitized });
    return { vector: res.data[0]?.embedding || [], model: res.model || model };
  }

  // Gemini default
  const model = options.model || process.env.EMBEDDINGS_MODEL || 'text-embedding-004';

  if (options.customApiKey) {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(options.customApiKey);
    const modelInst = genAI.getGenerativeModel({ model });
    const res = await modelInst.embedContent(sanitized);
    return { vector: res.embedding?.values || [], model };
  }

  // Vertex AI
  const { VertexAI } = require('@google-cloud/vertexai');
  const vertex = new VertexAI({ project, location });
  const modelInst = vertex.getGenerativeModel({ model });
  const res = await modelInst.embedContent({
    content: { role: 'user', parts: [{ text: sanitized }] },
  });
  return { vector: res.embedding?.values || [], model };
}

/**
 * Rank a set of { id, vector } candidates against a query vector.
 * Candidates scoring below `minScore` are excluded.
 *
 * @param {number[]} queryVector
 * @param {Array<{id: string, vector: number[], [k:string]: any}>} candidates
 * @param {number} limit
 * @param {number} [minScore=0]
 * @returns {Array<{id: string, score: number, [k:string]: any}>}
 */
function rankBySimilarity(queryVector, candidates, limit = 10, minScore = 0) {
  const scored = candidates
    .filter((c) => Array.isArray(c.vector) && c.vector.length > 0)
    .map((c) => ({ ...c, score: cosineSimilarity(queryVector, c.vector) }))
    .filter((c) => c.score >= minScore)
    .sort((x, y) => y.score - x.score);
  return scored.slice(0, limit);
}

module.exports = { embedText, cosineSimilarity, rankBySimilarity };
