const { VertexAI } = require('@google-cloud/vertexai');
const { randomUUID } = require('crypto');
const { redactText } = require('../lib/redaction');

const project = process.env.GCP_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;
const location = process.env.VERTEX_LOCATION || 'us-central1';
const useVertex = (process.env.USE_VERTEX || 'true').toLowerCase() === 'true';
const modelCache = new Map();

function getVertexModel(modelName) {
  if (!useVertex) return null;
  if (!project) throw new Error('GCP_PROJECT is required for Vertex AI');
  const resolvedModel = modelName || process.env.VERTEX_MODEL || 'gemini-1.5-pro';
  const cacheKey = `${project}:${location}:${resolvedModel}`;
  if (modelCache.has(cacheKey)) return modelCache.get(cacheKey);
  const vertex = new VertexAI({ project, location });
  const model = vertex.getGenerativeModel({ model: resolvedModel });
  modelCache.set(cacheKey, model);
  return model;
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try { return JSON.parse(match[0]); } catch { return null; }
  }
}

function createTimeoutPromise(timeoutMs) {
  let timer;
  const promise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('model_timeout')), timeoutMs);
  });
  return { promise, timer };
}

async function generateWithRetry(model, contents, generationConfig) {
  const maxAttempts = Number(process.env.VERTEX_RETRY_ATTEMPTS || 2);
  let lastError;
  for (let attempt = 0; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await model.generateContent({
        contents,
        generationConfig,
      });
      return response;
    } catch (error) {
      lastError = error;
      const retriable = /timeout|429|503|unavailable|resource exhausted/i.test(error && error.message ? error.message : '');
      if (!retriable || attempt === maxAttempts) break;
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }
  throw lastError;
}

async function callGemini(prompt, modelName = 'gemini-1.5-pro', options = {}) {
  const sanitizedPrompt = redactText(prompt);
  const timeoutMs = Number(process.env.VERTEX_TIMEOUT_MS || 30000);
  if (!useVertex) {
    return {
      id: randomUUID(),
      model: modelName,
      text: `MOCK_RESPONSE: ${sanitizedPrompt.slice(0, 400)}`,
      tokens: { prompt: 10, completion: 50 },
      structured: null,
    };
  }

  const model = getVertexModel(modelName);
  const generationConfig = {
    temperature: options.temperature ?? 0.2,
    maxOutputTokens: options.maxOutputTokens ?? 1024,
    responseMimeType: options.responseMimeType || 'application/json',
  };

  const { promise: timeoutPromise, timer } = createTimeoutPromise(timeoutMs);
  try {
    const response = await Promise.race([
      generateWithRetry(model, [{ role: 'user', parts: [{ text: sanitizedPrompt }] }], generationConfig),
      timeoutPromise,
    ]);

    const candidate = response.response?.candidates?.[0];
    const rawText = candidate?.content?.parts?.map((part) => part.text || '').join('') || '';
    const structured = safeJsonParse(rawText);
    const usage = response.response?.usageMetadata || null;

    return {
      id: randomUUID(),
      model: modelName,
      text: rawText,
      structured,
      tokens: usage,
    };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { callGemini };
