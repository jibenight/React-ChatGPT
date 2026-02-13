const { GoogleGenAI } = require('@google/genai');
const db = require('../models/database');
const cryptoJS = require('crypto-js');
const { getFromCache, setInCache } = require('../apiKeyCache');
const logger = require('../logger');
const DOMPurify = require('isomorphic-dompurify');
const { parseAttachments, parseDataUrl, uploadGeminiAttachments } = require('./attachmentHelper');
const { resolveChatProviderError } = require('./chatErrors');
const { routeToProvider } = require('./providers');

const sanitize = (input: any) => {
  if (typeof input !== 'string') return '';
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [], KEEP_CONTENT: true });
};

const MAX_MESSAGE_LENGTH = 8000;
const MAX_ATTACHMENTS = 4;
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const allowedProviders = new Set(['openai', 'gemini', 'claude', 'mistral', 'groq']);
const defaultModels = {
  openai: 'gpt-4o',
  gemini: 'gemini-2.5-pro',
  claude: 'claude-3-5-sonnet-20240620',
  mistral: 'mistral-large-latest',
  groq: 'llama-3.3-70b-versatile',
};

exports.sendMessage = async (req, res) => {
  const { sessionId, threadId, message, provider, model, projectId, attachments } = req.body;
  const userId = req.user?.id;
  const sanitizedMessage = message ? sanitize(message) : '';
  const incomingAttachments = Array.isArray(attachments) ? attachments : [];
  const targetProvider = provider || 'openai';
  const targetModel = model || defaultModels[targetProvider];
  const activeThreadId = threadId || sessionId;

  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  if (!allowedProviders.has(targetProvider)) return res.status(400).json({ error: 'Unsupported provider' });
  if (!activeThreadId || (!sanitizedMessage && incomingAttachments.length === 0)) return res.status(400).json({ error: 'Missing required fields' });
  if (sanitizedMessage.length > MAX_MESSAGE_LENGTH) return res.status(413).json({ error: 'Message too long' });
  if (incomingAttachments.length > MAX_ATTACHMENTS) return res.status(400).json({ error: 'Too many attachments' });

  for (const attachment of incomingAttachments) {
    if (!attachment) continue;
    if (attachment.dataUrl) {
      const parsed = parseDataUrl(attachment.dataUrl);
      if (!parsed?.mimeType || !parsed.base64) return res.status(400).json({ error: 'Invalid attachment data' });
      if (!ALLOWED_IMAGE_TYPES.has(parsed.mimeType)) return res.status(400).json({ error: 'Unsupported attachment type' });
      if (Buffer.byteLength(parsed.base64, 'base64') > MAX_ATTACHMENT_BYTES) return res.status(413).json({ error: 'Attachment too large' });
    }
    if (attachment.fileUri && typeof attachment.fileUri !== 'string') return res.status(400).json({ error: 'Invalid attachment reference' });
  }

  try {
    // --- Decrypt API key ---
    let apiKey = getFromCache(userId, targetProvider);
    if (!apiKey) {
      const result = await new Promise<any>((resolve, reject) => {
        db.get('SELECT api_key FROM api_keys WHERE user_id = ? AND provider = ?', [userId, targetProvider], (err, row) => {
          if (err) reject(err); else resolve(row);
        });
      });
      if (!result) return res.status(400).json({ error: `API key not found for ${targetProvider}` });
      const encryptionKey = process.env.ENCRYPTION_KEY;
      if (!encryptionKey) return res.status(500).json({ error: 'Server misconfiguration' });
      try {
        apiKey = cryptoJS.AES.decrypt(result.api_key, encryptionKey).toString(cryptoJS.enc.Utf8);
      } catch {
        return res.status(500).json({ error: 'Failed to decrypt API key' });
      }
      if (!apiKey) return res.status(401).json({ error: 'Invalid API key' });
      setInCache(userId, targetProvider, apiKey);
    }

    // --- Thread & attachments ---
    const threadRow = await new Promise<any>((resolve, reject) => {
      db.get('SELECT id, project_id FROM threads WHERE id = ? AND user_id = ?', [activeThreadId, userId], (err, row) => {
        if (err) reject(err); else resolve(row);
      });
    });

    let storedAttachments: any[] = [];
    if (incomingAttachments.length > 0) {
      if (targetProvider !== 'gemini') return res.status(400).json({ error: 'Attachments are only supported for Gemini' });
      const genAI = new GoogleGenAI({ apiKey });
      storedAttachments = await uploadGeminiAttachments(genAI, incomingAttachments);
    }

    // --- Store user message ---
    await db.transaction(async (txn) => {
      if (!threadRow) {
        const titleSource = sanitizedMessage.trim() ? sanitizedMessage : storedAttachments[0]?.name || 'Nouvelle conversation';
        await new Promise<void>((resolve, reject) => {
          txn.run('INSERT INTO threads (id, user_id, project_id, title, last_message_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)',
            [activeThreadId, userId, projectId || null, titleSource.slice(0, 60)], err => { if (err) reject(err); else resolve(); });
        });
      } else if (!threadRow.project_id && projectId) {
        await new Promise<void>((resolve, reject) => {
          txn.run('UPDATE threads SET project_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
            [projectId, activeThreadId, userId], err => { if (err) reject(err); else resolve(); });
        });
      }
      await new Promise<void>((resolve, reject) => {
        txn.run('INSERT INTO messages (thread_id, role, content, attachments, provider, model) VALUES (?, ?, ?, ?, ?, ?)',
          [activeThreadId, 'user', sanitizedMessage, storedAttachments.length > 0 ? JSON.stringify(storedAttachments) : null, targetProvider, targetModel],
          err => { if (err) reject(err); else resolve(); });
      });
    });

    // --- Build context ---
    const effectiveProjectId = threadRow?.project_id || projectId || null;
    let projectContext = null;
    if (effectiveProjectId) {
      projectContext = await new Promise<any>((resolve, reject) => {
        db.get('SELECT instructions, context_data FROM projects WHERE id = ? AND user_id = ?',
          [effectiveProjectId, userId], (err, row) => { if (err) reject(err); else resolve(row); });
      });
    }

    const systemParts: string[] = [];
    if (projectContext?.instructions) systemParts.push(`Project instructions:\n${projectContext.instructions}`);
    if (projectContext?.context_data) systemParts.push(`Project context:\n${projectContext.context_data}`);
    const systemPrompt = systemParts.join('\n\n');

    const historyRows = await new Promise<any[]>((resolve, reject) => {
      db.all('SELECT role, content, attachments FROM messages WHERE thread_id = ? ORDER BY id DESC LIMIT 50',
        [activeThreadId], (err, rows) => { if (err) reject(err); else resolve(rows); });
    });
    const history = historyRows.reverse().map(row => ({
      role: row.role, content: row.content, attachments: parseAttachments(row.attachments),
    }));
    const textOnlyHistory = history.map(entry => ({ role: entry.role, content: entry.content }));

    // --- SSE setup ---
    const wantsStream = typeof req.headers.accept === 'string' && req.headers.accept.includes('text/event-stream');
    if (wantsStream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();
    }
    const sendEvent = (payload) => { if (wantsStream) res.write(`data: ${JSON.stringify(payload)}\n\n`); };

    // --- Route to provider ---
    const reply = await routeToProvider({
      provider: targetProvider, apiKey, model: targetModel,
      textOnlyHistory, history, systemPrompt, wantsStream, sendEvent, res,
    });

    if (wantsStream && reply && targetProvider !== 'openai' && targetProvider !== 'groq') {
      sendEvent({ type: 'delta', content: reply });
    }

    // --- Store assistant message ---
    await db.transaction(async (txn) => {
      await new Promise<void>((resolve, reject) => {
        txn.run('INSERT INTO messages (thread_id, role, content, provider, model) VALUES (?, ?, ?, ?, ?)',
          [activeThreadId, 'assistant', reply, targetProvider, targetModel], err => { if (err) reject(err); else resolve(); });
      });
      await new Promise<void>((resolve, reject) => {
        txn.run('UPDATE threads SET last_message_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
          [activeThreadId, userId], err => { if (err) reject(err); else resolve(); });
      });
    });

    if (wantsStream) {
      sendEvent({ type: 'done', reply, threadId: activeThreadId });
      res.end();
    } else {
      res.json({ reply, threadId: activeThreadId });
    }
  } catch (err) {
    const errorMessage = resolveChatProviderError(err);
    logger.error({ err: errorMessage }, 'Chat request failed');
    if (typeof req.headers.accept === 'string' && req.headers.accept.includes('text/event-stream')) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: errorMessage })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: errorMessage });
    }
  }
};
