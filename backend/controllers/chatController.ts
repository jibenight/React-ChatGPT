const OpenAI = require('openai').default;
const { GoogleGenAI } = require('@google/genai');
const Anthropic = require('@anthropic-ai/sdk');
const MistralClient = require('@mistralai/mistralai');
const db = require('../models/database');
const cryptoJS = require('crypto-js');
const { Blob } = require('buffer');
const { getFromCache, setInCache } = require('../apiKeyCache');
const logger = require('../logger');

const parseAttachments = value => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const parseDataUrl = dataUrl => {
  if (typeof dataUrl !== 'string') return null;
  const match = dataUrl.match(/^data:(.*?);base64,(.*)$/);
  if (!match) return null;
  return { mimeType: match[1], base64: match[2] };
};

const detectAttachmentType = mimeType => {
  if (mimeType && mimeType.startsWith('image/')) return 'image';
  if (mimeType && mimeType.includes('pdf')) return 'document';
  if (mimeType && mimeType.startsWith('text/')) return 'document';
  return 'file';
};

const formatProviderErrorMessage = raw => {
  if (typeof raw !== 'string') return null;
  let message = raw.trim();
  if (!message) return null;

  if (message.startsWith('{') && message.endsWith('}')) {
    try {
      const parsed = JSON.parse(message);
      const parsedMessage = parsed?.error?.message;
      if (typeof parsedMessage === 'string' && parsedMessage.trim()) {
        message = parsedMessage;
      }
    } catch {
      // Keep original message when payload is not valid JSON.
    }
  }

  message = message.split('\n').map(part => part.trim()).filter(Boolean).join(' ');
  if (message.length > 350) {
    return `${message.slice(0, 347)}...`;
  }
  return message;
};

const resolveChatProviderError = err => {
  const candidates = [
    err?.response?.data?.error?.message,
    err?.response?.data?.error,
    err?.error?.message,
    err?.message,
  ];

  for (const candidate of candidates) {
    const formatted = formatProviderErrorMessage(candidate);
    if (formatted) return formatted;
  }

  return 'Internal server error';
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

const uploadGeminiAttachments = async (genAI, attachments) => {
  const results = [];
  for (const attachment of attachments) {
    if (!attachment) continue;
    if (attachment.fileUri) {
      results.push({
        id: attachment.id,
        name: attachment.name || null,
        mimeType: attachment.mimeType || null,
        type: attachment.type || detectAttachmentType(attachment.mimeType),
        fileUri: attachment.fileUri,
      });
      continue;
    }

    const parsed = parseDataUrl(attachment.dataUrl);
    if (!parsed?.base64) continue;
    const mimeType = attachment.mimeType || parsed.mimeType;
    const buffer = Buffer.from(parsed.base64, 'base64');
    const blob = new Blob([buffer], { type: mimeType });
    const file = await genAI.files.upload({
      file: blob,
      config: {
        mimeType,
        displayName: attachment.name || undefined,
      },
    });

    const resolvedFileUri =
      file.uri ||
      (file.name && file.name.startsWith('files/')
        ? `https://generativelanguage.googleapis.com/${file.name}`
        : file.name) ||
      null;

    results.push({
      id: attachment.id,
      name: attachment.name || file.displayName || file.name || null,
      mimeType: file.mimeType || mimeType || null,
      type: detectAttachmentType(file.mimeType || mimeType),
      fileUri: resolvedFileUri,
      sizeBytes: file.sizeBytes || null,
    });
  }

  return results.filter(item => item.fileUri);
};

const streamOpenAi = async ({
  client,
  model,
  messages,
  onDelta = delta => {
    void delta;
  },
  onComplete = () => {},
  onError = err => {
    void err;
  },
  signal,
}) => {
  const stream = await client.chat.completions.create({
    model,
    messages,
    stream: true,
  });

  try {
    for await (const chunk of stream) {
      if (signal?.aborted) {
        stream.controller?.abort();
        break;
      }
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) {
        onDelta(delta);
      }
    }
    onComplete();
  } catch (err) {
    onError(err);
  }
};

exports.sendMessage = async (req, res) => {
  const {
    sessionId,
    threadId,
    message,
    provider,
    model,
    projectId,
    attachments,
  } = req.body;
  const userId = req.user?.id;
  const incomingAttachments = Array.isArray(attachments) ? attachments : [];
  const targetProvider = provider || 'openai';
  const allowedProviders = new Set(['openai', 'gemini', 'claude', 'mistral', 'groq']);
  const defaultModels = {
    openai: 'gpt-4o',
    gemini: 'gemini-2.5-pro',
    claude: 'claude-3-5-sonnet-20240620',
    mistral: 'mistral-large-latest',
    groq: 'llama-3.3-70b-versatile',
  };
  const targetModel = model || defaultModels[targetProvider];
  const activeThreadId = threadId || sessionId;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!allowedProviders.has(targetProvider)) {
    return res.status(400).json({ error: 'Unsupported provider' });
  }

  if (!activeThreadId || (!message && incomingAttachments.length === 0)) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (typeof message === 'string' && message.length > MAX_MESSAGE_LENGTH) {
    return res.status(413).json({ error: 'Message too long' });
  }

  if (incomingAttachments.length > MAX_ATTACHMENTS) {
    return res.status(400).json({ error: 'Too many attachments' });
  }

  for (const attachment of incomingAttachments) {
    if (!attachment) continue;
    if (attachment.dataUrl) {
      const parsed = parseDataUrl(attachment.dataUrl);
      if (!parsed?.mimeType || !parsed.base64) {
        return res.status(400).json({ error: 'Invalid attachment data' });
      }
      if (!ALLOWED_IMAGE_TYPES.has(parsed.mimeType)) {
        return res.status(400).json({ error: 'Unsupported attachment type' });
      }
      const sizeBytes = Buffer.byteLength(parsed.base64, 'base64');
      if (sizeBytes > MAX_ATTACHMENT_BYTES) {
        return res.status(413).json({ error: 'Attachment too large' });
      }
    }
    if (attachment.fileUri && typeof attachment.fileUri !== 'string') {
      return res.status(400).json({ error: 'Invalid attachment reference' });
    }
  }

  try {
    let apiKey = getFromCache(userId, targetProvider);

    if (!apiKey) {
      const result = await new Promise<any>((resolve, reject) => {
        db.get(
          'SELECT api_key FROM api_keys WHERE user_id = ? AND provider = ?',
          [userId, targetProvider],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          },
        );
      });

      if (!result)
        return res
          .status(400)
          .json({ error: `API key not found for ${targetProvider}` });

      const encryptionKey = process.env.ENCRYPTION_KEY;
      if (!encryptionKey) {
        return res.status(500).json({ error: 'Server misconfiguration' });
      }
      try {
        const bytes = cryptoJS.AES.decrypt(result.api_key, encryptionKey);
        apiKey = bytes.toString(cryptoJS.enc.Utf8);
      } catch (e) {
        return res.status(500).json({ error: 'Failed to decrypt API key' });
      }

      if (!apiKey) return res.status(401).json({ error: 'Invalid API key' });

      setInCache(userId, targetProvider, apiKey);
    }

    const threadRow = await new Promise<any>((resolve, reject) => {
      db.get(
        'SELECT id, project_id FROM threads WHERE id = ? AND user_id = ?',
        [activeThreadId, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        },
      );
    });

    let storedAttachments = [];
    if (incomingAttachments.length > 0) {
      if (targetProvider !== 'gemini') {
        return res
          .status(400)
          .json({ error: 'Attachments are only supported for Gemini' });
      }
      const genAI = new GoogleGenAI({ apiKey });
      storedAttachments = await uploadGeminiAttachments(
        genAI,
        incomingAttachments,
      );
    }

    await db.transaction(async txn => {
      if (!threadRow) {
        const titleSource =
          message && message.trim()
            ? message
            : storedAttachments[0]?.name || 'Nouvelle conversation';
        const title = titleSource.slice(0, 60);
        await new Promise<void>((resolve, reject) => {
          txn.run(
            `INSERT INTO threads (id, user_id, project_id, title, last_message_at)
             VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [activeThreadId, userId, projectId || null, title],
            err => {
              if (err) reject(err);
              else resolve();
            },
          );
        });
      } else if (!threadRow.project_id && projectId) {
        await new Promise<void>((resolve, reject) => {
          txn.run(
            `UPDATE threads
             SET project_id = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND user_id = ?`,
            [projectId, activeThreadId, userId],
            err => {
              if (err) reject(err);
              else resolve();
            },
          );
        });
      }

      await new Promise<void>((resolve, reject) => {
        txn.run(
          `INSERT INTO messages (thread_id, role, content, attachments, provider, model)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            activeThreadId,
            'user',
            message || '',
            storedAttachments.length > 0
              ? JSON.stringify(storedAttachments)
              : null,
            targetProvider,
            targetModel,
          ],
          err => {
            if (err) reject(err);
            else resolve();
          },
        );
      });
    });

    const effectiveProjectId = threadRow?.project_id || projectId || null;

    let projectContext = null;
    if (effectiveProjectId) {
      projectContext = await new Promise<any>((resolve, reject) => {
        db.get(
          `SELECT instructions, context_data
           FROM projects
           WHERE id = ? AND user_id = ?`,
          [effectiveProjectId, userId],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          },
        );
      });
    }

    const systemParts = [];
    if (projectContext?.instructions) {
      systemParts.push(`Project instructions:\n${projectContext.instructions}`);
    }
    if (projectContext?.context_data) {
      systemParts.push(`Project context:\n${projectContext.context_data}`);
    }
    const systemPrompt = systemParts.join('\n\n');

    const historyRows = await new Promise<any[]>((resolve, reject) => {
      db.all(
        `SELECT role, content, attachments
         FROM messages
         WHERE thread_id = ?
         ORDER BY id DESC
         LIMIT 50`,
        [activeThreadId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        },
      );
    });
    const history = historyRows.reverse().map(row => ({
      role: row.role,
      content: row.content,
      attachments: parseAttachments(row.attachments),
    }));
    const textOnlyHistory = history.map(entry => ({
      role: entry.role,
      content: entry.content,
    }));

    const wantsStream =
      typeof req.headers.accept === 'string' &&
      req.headers.accept.includes('text/event-stream');

    if (wantsStream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();
    }

    const sendEvent = payload => {
      if (!wantsStream) return;
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    let reply = '';
    if (targetProvider === 'openai') {
      const client = new OpenAI({ apiKey });
      const messages = systemPrompt
        ? [{ role: 'system', content: systemPrompt }, ...textOnlyHistory]
        : textOnlyHistory;
      if (wantsStream) {
        const abortController = new AbortController();
        res.on('close', () => {
          abortController.abort();
        });
        await streamOpenAi({
          client,
          model: targetModel,
          messages,
          signal: abortController.signal,
          onDelta: delta => {
            reply += delta;
            sendEvent({ type: 'delta', content: delta });
          },
          onError: err => {
            sendEvent({ type: 'error', error: err?.message || 'Stream error' });
          },
        });
      } else {
        const response = await client.chat.completions.create({
          model: targetModel,
          messages,
        });
        reply = response.choices[0].message.content;
      }
    } else if (targetProvider === 'gemini') {
      const genAI = new GoogleGenAI({ apiKey });
      const contents = [];
      if (systemPrompt) {
        contents.push({
          role: 'user',
          parts: [{ text: systemPrompt }],
        });
      }
      history.forEach(entry => {
        const parts = [];
        if (entry.content) {
          parts.push({ text: entry.content });
        }
        if (entry.role === 'user' && Array.isArray(entry.attachments)) {
          entry.attachments.forEach(att => {
            if (!att?.fileUri) return;
            const fileUri =
              typeof att.fileUri === 'string' &&
              att.fileUri.startsWith('files/')
                ? `https://generativelanguage.googleapis.com/${att.fileUri}`
                : att.fileUri;
            parts.push({
              fileData: {
                fileUri,
                mimeType: att.mimeType || undefined,
              },
            });
          });
        }
        if (parts.length === 0) return;
        contents.push({
          role: entry.role === 'assistant' ? 'model' : 'user',
          parts,
        });
      });

      const response = await genAI.models.generateContent({
        model: targetModel,
        contents,
      });
      reply = response.text || '';
    } else if (targetProvider === 'claude') {
      const anthropic = new Anthropic({ apiKey: apiKey });
      const msg = await anthropic.messages.create({
        model: targetModel,
        max_tokens: 1024,
        system: systemPrompt || undefined,
        messages: textOnlyHistory,
      });
      reply = msg.content[0].text;
    } else if (targetProvider === 'mistral') {
      const client = new MistralClient(apiKey);
      const messages = systemPrompt
        ? [{ role: 'system', content: systemPrompt }, ...textOnlyHistory]
        : textOnlyHistory;
      const chatResponse = await client.chat({
        model: targetModel,
        messages,
      });
      reply = chatResponse.choices[0].message.content;
    } else if (targetProvider === 'groq') {
      const messages = systemPrompt
        ? [{ role: 'system', content: systemPrompt }, ...textOnlyHistory]
        : textOnlyHistory;
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: targetModel,
          messages,
          stream: wantsStream,
        }),
      });

      if (!groqRes.ok) {
        const errBody = await groqRes.text();
        throw new Error(`Groq API error ${groqRes.status}: ${errBody}`);
      }

      if (wantsStream) {
        const reader = groqRes.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const data = trimmed.replace(/^data:\s*/, '');
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                reply += delta;
                sendEvent({ type: 'delta', content: delta });
              }
            } catch { /* skip malformed SSE chunks */ }
          }
        }
      } else {
        const data = await groqRes.json();
        reply = data.choices[0].message.content;
      }
    }

    if (wantsStream && reply && targetProvider !== 'openai' && targetProvider !== 'groq') {
      sendEvent({ type: 'delta', content: reply });
    }

    await db.transaction(async txn => {
      await new Promise<void>((resolve, reject) => {
        txn.run(
          `INSERT INTO messages (thread_id, role, content, provider, model)
           VALUES (?, ?, ?, ?, ?)`,
          [activeThreadId, 'assistant', reply, targetProvider, targetModel],
          err => {
            if (err) reject(err);
            else resolve();
          },
        );
      });

      await new Promise<void>((resolve, reject) => {
        txn.run(
          `UPDATE threads
           SET last_message_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
           WHERE id = ? AND user_id = ?`,
          [activeThreadId, userId],
          err => {
            if (err) reject(err);
            else resolve();
          },
        );
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
    if (
      typeof req.headers.accept === 'string' &&
      req.headers.accept.includes('text/event-stream')
    ) {
      res.write(
        `data: ${JSON.stringify({
          type: 'error',
          error: errorMessage,
        })}\n\n`,
      );
      res.end();
    } else {
      res.status(500).json({ error: errorMessage });
    }
  }
};
