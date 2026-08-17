const { createBaseApp, registerErrorHandler } = require('../lib/baseApp');
const { db, admin } = require('../firebase');
const { randomUUID } = require('crypto');
const { callGemini } = require('../services/ai');
const { embedText, rankBySimilarity } = require('../lib/embeddings');
const { explainDiffTemplate, branchSummaryTemplate } = require('../prompts');
const { ErrorCodes, typedError } = require('../lib/errors');
const { redactText, redactDeep } = require('../lib/redaction');
const { auditLog } = require('../middleware/auditLog');
const { aiLimiter } = require('../middleware/rateLimiter');
const { requireAuth } = require('../middleware/auth');
const {
  logCallRules,
  explainRules,
  summarizeRules,
  indexSearchRules,
  semanticSearchRules,
} = require('../middleware/validate');
const {
  verifyProjectOwnership,
  verifyEpisodeOwnership,
  checkIdempotency,
  storeIdempotency,
  getProviderConfig,
  structuredOrFallback,
  sendError,
} = require('../lib/apiHelpers');

const app = createBaseApp();

/**
 * Run `fn` over `items` with at most `limit` tasks in flight.
 * Resolves in input order; per-item errors must be handled by `fn`.
 */
async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next;
      next += 1;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

/**
 * Resolve the embedding provider for semantic search, or short-circuit with a
 * canonical CONFIG_ERROR (500) when AI is not configured or the provider has
 * no embeddings API. Returns null after sending a response.
 */
async function getEmbeddingProvider(uid, req, res) {
  const { provider, customApiKey, configuredProvider } = await getProviderConfig(uid, null);
  if (configuredProvider === 'none') {
    res.status(500).json(typedError(ErrorCodes.CONFIG_ERROR, 'No AI provider configured. Configure Gemini or OpenAI for semantic search.', { requestId: req.id }));
    return null;
  }
  if (provider === 'anthropic') {
    res.status(500).json(typedError(ErrorCodes.CONFIG_ERROR, 'Anthropic has no embeddings API. Configure Gemini or OpenAI for semantic search.', { requestId: req.id }));
    return null;
  }
  return { provider, customApiKey };
}

// AI routes require authentication
app.use(requireAuth);
app.use(aiLimiter);

/**
 * POST /calls/log
 * Logs a specific AI call or context snapshot within an episode.
 * Supports idempotency via X-Idempotency-Key header.
 */
app.post('/calls/log', logCallRules, async (req, res) => {
  const { uid } = req.user;
  const payload = req.body; 
  const { projectId, episodeId, promptText, modelName, source, modelResponse } = payload;
  const idempotencyKey = req.headers['x-idempotency-key'] || null;
  
  if (await checkIdempotency(uid, idempotencyKey, req, res)) return;

  const skipAI = (source === 'git_commit' || source === 'manual_log');
  const started = Date.now();
  
  try {
    const epRef = await verifyEpisodeOwnership(uid, projectId, episodeId, req, res);
    if (!epRef) return;

    let aiResp;
    if (skipAI) {
      aiResp = {
        text: modelResponse || '',
        model: modelName || (source === 'git_commit' ? 'git' : 'external'),
        tokens: null
      };
    } else {
      const { provider, customApiKey } = await getProviderConfig(uid, payload.customApiKey);
      if (provider !== 'gemini' && !customApiKey) {
        return res.status(400).json(
          typedError(ErrorCodes.CONFIG_ERROR, `No API key configured for ${provider}. Please configure your provider in settings.`, {
            requestId: req.id,
            action: 'none',
          })
        );
      }
      aiResp = await callGemini(promptText, modelName || 'gemini-1.5-pro', { customApiKey, provider });
    }
    
    const latencyMs = Date.now() - started;
    const callId = randomUUID();
    const callRef = db.collection('users').doc(uid).collection('projects').doc(projectId).collection('episodes').doc(episodeId).collection('calls').doc(callId);
    
    const callDoc = {
      createdAt: new Date(),
      source: source || 'extension',
      intentTag: payload.intentTag || null,
      promptText: redactText(promptText),
      modelName: aiResp.model,
      modelResponse: redactText(aiResp.text),
      branchName: payload.branchName || null,
      activeFilePath: payload.activeFilePath || null,
      relatedFiles: redactDeep(payload.relatedFiles || []),
      diffSnapshot: redactDeep(payload.diffSnapshot || null),
      diffHash: payload.diffHash || null,
      todoMatches: redactDeep(payload.todoMatches || []),
      latencyMs: skipAI ? 0 : latencyMs,
      tokenUsage: aiResp.tokens || null,
      status: 'success'
    };
    
    const batch = db.batch();
    batch.set(callRef, callDoc);
    batch.update(epRef, { callCount: admin.firestore.FieldValue.increment(1) });
    await batch.commit();

    const responseData = { ok: true, callId, modelName: aiResp.model, modelResponse: aiResp.text, latencyMs: skipAI ? 0 : latencyMs, saved: true };

    await storeIdempotency(uid, idempotencyKey, responseData);

    auditLog('DATA_WRITE', { action: 'log_call', projectId, episodeId, callId }, req);
    return res.json(responseData);
  } catch (err) {
    return sendError(res, req, err);
  }
});

/**
 * POST /episodes/explain
 * Generates an AI explanation of the diff accumulated in an episode.
 */
app.post('/episodes/explain', explainRules, async (req, res) => {
  const { uid } = req.user;
  const { projectId, episodeId, diffHash, changedFiles, customApiKey, diffText } = req.body;
  const started = Date.now();
  
  try {
    const epRef = await verifyEpisodeOwnership(uid, projectId, episodeId, req, res);
    if (!epRef) return;

    const epDoc = await epRef.get();
    const epData = epDoc.data();
    
    const finalDiffHash = diffHash || epData.latestDiffHash;
    if (!finalDiffHash) {
      return res.status(400).json(
        typedError(ErrorCodes.VALIDATION_ERROR, 'No diff hash provided or found on the episode.', { requestId: req.id })
      );
    }

    const cacheRef = db.collection('users').doc(uid).collection('projects').doc(projectId).collection('episodes').doc(episodeId).collection('cache').doc(finalDiffHash);
    const cached = await cacheRef.get();
    if (cached.exists) {
      auditLog('DATA_ACCESS', { action: 'explain_episode', projectId, episodeId, diffHash: finalDiffHash, fromCache: true, durationMs: Date.now() - started }, req);
      return res.json({ ok: true, fromCache: true, ...cached.data().result });
    }

    const finalChangedFiles = changedFiles || epData.changedFiles || [];
    const changedFilesList = finalChangedFiles.join(', ');

    let finalDiffText = diffText || '';
    if (!finalDiffText) {
      try {
        const latestCall = await epRef.collection('calls')
          .orderBy('createdAt', 'desc')
          .limit(1)
          .get();
        if (!latestCall.empty) {
          const callData = latestCall.docs[0].data();
          finalDiffText = callData.diffSnapshot || '';
        }
      } catch { /* no diff available, proceed with filenames only */ }
    }
    if (finalDiffText && finalDiffText.length > 8000) {
      finalDiffText = finalDiffText.slice(0, 8000) + '\n... [TRUNCATED]';
    }

    const prompt = explainDiffTemplate({ changedFilesList, diffText: redactText(finalDiffText) });
    const { provider, customApiKey: finalApiKey } = await getProviderConfig(uid, customApiKey);
    if (provider !== 'gemini' && !finalApiKey) {
      return res.status(400).json(
        typedError(ErrorCodes.CONFIG_ERROR, `No API key configured for ${provider}.`, { requestId: req.id })
      );
    }
    const aiResp = await callGemini(prompt, 'gemini-1.5-pro', { responseMimeType: 'application/json', maxOutputTokens: 2048, customApiKey: finalApiKey, provider });
    const result = structuredOrFallback(aiResp, (text) => ({ summary: text, risks: [], checks: [] }));
    const normalized = {
      summary: result.summary || aiResp.text,
      risks: Array.isArray(result.risks) ? result.risks : [],
      checks: Array.isArray(result.checks) ? result.checks : [],
    };
    await cacheRef.set({ createdAt: new Date(), result: normalized });
    
    auditLog('DATA_ACCESS', { action: 'explain_episode', projectId, episodeId, diffHash: finalDiffHash, fromCache: false, durationMs: Date.now() - started }, req);
    return res.json({ ok: true, ...normalized });
  } catch (err) {
    return sendError(res, req, err, ErrorCodes.AI_SERVICE_UNAVAILABLE);
  }
});

/**
 * POST /branches/summarize
 * Summarizes the activity across multiple episodes on a branch.
 */
app.post('/branches/summarize', summarizeRules, async (req, res) => {
  const { uid } = req.user;
  const { projectId, branchName, episodes, customApiKey } = req.body;
  const started = Date.now();
  
  try {
    const projectRef = await verifyProjectOwnership(uid, projectId, req, res);
    if (!projectRef) return;

    const episodesSummaryList = (episodes || []).map((e) => e.episodeSummary || e.label || '').join('\n');
    const prompt = branchSummaryTemplate({ episodesSummaryList });
    const { provider, customApiKey: finalApiKey } = await getProviderConfig(uid, customApiKey);
    if (provider !== 'gemini' && !finalApiKey) {
      return res.status(400).json(
        typedError(ErrorCodes.CONFIG_ERROR, `No API key configured for ${provider}.`, { requestId: req.id })
      );
    }
    const aiResp = await callGemini(prompt, 'gemini-1.5-pro', { responseMimeType: 'application/json', maxOutputTokens: 1024, customApiKey: finalApiKey, provider });
    const result = structuredOrFallback(aiResp, (text) => ({ pr_summary: text, key_changes: [], review_risks: [] }));
    const responseData = {
      ok: true,
      pr_summary: result.pr_summary || aiResp.text,
      key_changes: Array.isArray(result.key_changes) ? result.key_changes : [],
      review_risks: Array.isArray(result.review_risks) ? result.review_risks : [],
    };
    
    auditLog('DATA_ACCESS', { action: 'summarize_branch', projectId, branchName, durationMs: Date.now() - started }, req);
    return res.json(responseData);
  } catch (err) {
    return sendError(res, req, err, ErrorCodes.AI_SERVICE_UNAVAILABLE);
  }
});

/**
 * POST /search/index
 * Generates embeddings for calls in a project (manual trigger — AI cost is
 * user-controlled). If `episodeId` is given, only that episode's calls are
 * indexed. Vectors are stored under users/{uid}/projects/{pid}/vectors/{callId}.
 */
app.post('/search/index', indexSearchRules, async (req, res) => {
  const { uid } = req.user;
  const { projectId, episodeId, force } = req.body;

  try {
    const projectRef = await verifyProjectOwnership(uid, projectId, req, res);
    if (!projectRef) return;

    const embeddingCfg = await getEmbeddingProvider(uid, req, res);
    if (!embeddingCfg) return;

    const MAX_INDEX_PER_RUN = 200;
    const EMBED_CONCURRENCY = 10;
    const vectorsCol = db.collection('users').doc(uid).collection('projects').doc(projectId).collection('vectors');

    let calls;
    if (episodeId) {
      const epRef = await verifyEpisodeOwnership(uid, projectId, episodeId, req, res);
      if (!epRef) return;
      const epCalls = await epRef.collection('calls').orderBy('createdAt', 'desc').limit(MAX_INDEX_PER_RUN).get();
      calls = epCalls.docs;
    } else {
      const episodesSnap = await db.collection('users').doc(uid).collection('projects').doc(projectId).collection('episodes').get();
      calls = [];
      for (const ep of episodesSnap.docs) {
        if (calls.length >= MAX_INDEX_PER_RUN) break;
        const remaining = MAX_INDEX_PER_RUN - calls.length;
        const epCalls = await ep.ref.collection('calls').orderBy('createdAt', 'desc').limit(remaining).get();
        for (const c of epCalls.docs) calls.push(c);
      }
    }

    let indexed = 0;
    let skipped = 0;
    let failed = 0;

    await mapLimit(calls, EMBED_CONCURRENCY, async (call) => {
      const vectorDoc = vectorsCol.doc(call.id);
      if (!force) {
        const existing = await vectorDoc.get();
        if (existing.exists) {
          skipped += 1;
          return;
        }
      }

      const cd = call.data();
      const textToEmbed = cd.promptText || cd.modelResponse;
      if (!textToEmbed) {
        skipped += 1;
        return;
      }

      try {
        const { vector, model } = await embedText(textToEmbed, embeddingCfg);
        await vectorDoc.set({
          embedding: vector,
          text: String(cd.promptText || cd.modelResponse || '').slice(0, 500),
          episodeId: call.ref.parent.parent.id,
          callId: call.id,
          branchName: cd.branchName || null,
          source: cd.source || null,
          model,
          indexedAt: new Date(),
        });
        indexed += 1;
      } catch (err) {
        failed += 1;
        console.warn(JSON.stringify({
          severity: 'WARNING',
          event: 'embedding_failed',
          callId: call.id,
          episodeId: call.ref.parent.parent.id,
          provider: embeddingCfg.provider,
          error: err.message,
        }));
      }
    });

    auditLog('DATA_WRITE', { action: 'index_semantic', projectId, episodeId: episodeId || null, indexed, skipped, failed }, req);
    return res.json({ ok: true, indexed, skipped, failed });
  } catch (err) {
    return sendError(res, req, err, ErrorCodes.AI_SERVICE_UNAVAILABLE);
  }
});

/**
 * POST /search/semantic
 * Embeds the query and returns the most similar indexed calls via cosine
 * similarity (in-memory rank over the project's indexed vectors).
 */
app.post('/search/semantic', semanticSearchRules, async (req, res) => {
  const { uid } = req.user;
  const { projectId, q, limit = 10 } = req.body;

  try {
    const projectRef = await verifyProjectOwnership(uid, projectId, req, res);
    if (!projectRef) return;

    const embeddingCfg = await getEmbeddingProvider(uid, req, res);
    if (!embeddingCfg) return;

    const { vector } = await embedText(q, embeddingCfg);

    const vectorsCol = db.collection('users').doc(uid).collection('projects').doc(projectId).collection('vectors');
    const snap = await vectorsCol.orderBy('indexedAt', 'desc').limit(2000).get();

    const candidates = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const parsedMin = Number(process.env.SEMANTIC_SCORE_THRESHOLD);
    const minScore = Number.isFinite(parsedMin) ? parsedMin : 0.3;
    const ranked = rankBySimilarity(vector, candidates, limit, minScore);

    const results = ranked
      .map((r) => ({
        callId: r.callId || r.id,
        episodeId: r.episodeId || null,
        branchName: r.branchName || null,
        source: r.source || null,
        text: r.text || '',
        score: Math.round(r.score * 1000) / 1000,
      }));

    auditLog('DATA_ACCESS', { action: 'search_semantic', projectId, queryLength: q.length, results: results.length, minScore }, req);
    return res.json({ ok: true, results });
  } catch (err) {
    return sendError(res, req, err, ErrorCodes.AI_SERVICE_UNAVAILABLE);
  }
});

registerErrorHandler(app);

module.exports = app;
