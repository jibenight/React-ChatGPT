const openai = require('openai');
const { GoogleGenAI } = require('@google/genai');
const Anthropic = require('@anthropic-ai/sdk');
const MistralClient = require('@mistralai/mistralai');
const db = require('../models/database');
const cryptoJS = require('crypto-js');

exports.sendMessage = async (req, res) => {
  const { userId, sessionId, threadId, message, provider, model, projectId } =
    req.body;
  const targetProvider = provider || 'openai';
  const defaultModels = {
    openai: 'gpt-4o',
    gemini: 'gemini-2.5-pro',
    claude: 'claude-3-5-sonnet-20240620',
    mistral: 'mistral-large-latest',
  };
  const targetModel = model || defaultModels[targetProvider];
  const activeThreadId = threadId || sessionId;

  if (!userId || !activeThreadId || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const result = await new Promise((resolve, reject) => {
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
    let apiKey;
    try {
      const bytes = cryptoJS.AES.decrypt(result.api_key, encryptionKey);
      apiKey = bytes.toString(cryptoJS.enc.Utf8);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to decrypt API key' });
    }

    if (!apiKey) return res.status(401).json({ error: 'Invalid API key' });

    const threadRow = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id, project_id FROM threads WHERE id = ? AND user_id = ?',
        [activeThreadId, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        },
      );
    });

    if (!threadRow) {
      const title = message.slice(0, 60);
      await new Promise((resolve, reject) => {
        db.run(
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
      await new Promise((resolve, reject) => {
        db.run(
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

    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO messages (thread_id, role, content, provider, model)
         VALUES (?, ?, ?, ?, ?)`,
        [activeThreadId, 'user', message, targetProvider, targetModel],
        err => {
          if (err) reject(err);
          else resolve();
        },
      );
    });

    const threadProject = await new Promise((resolve, reject) => {
      db.get(
        `SELECT project_id FROM threads WHERE id = ? AND user_id = ?`,
        [activeThreadId, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        },
      );
    });

    let projectContext = null;
    if (threadProject?.project_id) {
      projectContext = await new Promise((resolve, reject) => {
        db.get(
          `SELECT instructions, context_data
           FROM projects
           WHERE id = ? AND user_id = ?`,
          [threadProject.project_id, userId],
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

    const historyRows = await new Promise((resolve, reject) => {
      db.all(
        `SELECT role, content
         FROM messages
         WHERE thread_id = ?
         ORDER BY id DESC
         LIMIT 20`,
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
    }));

    let reply = '';
    if (targetProvider === 'openai') {
      const configuration = new openai.Configuration({ apiKey });
      const openaiApi = new openai.OpenAIApi(configuration);
      const messages = systemPrompt
        ? [{ role: 'system', content: systemPrompt }, ...history]
        : history;
      try {
        const response = await openaiApi.createChatCompletion({
          model: targetModel,
          messages,
        });
        reply = response.data.choices[0].message.content;
      } catch (e) {
        const response = await openaiApi.createCompletion({
          model: 'text-davinci-003',
          prompt: systemPrompt ? `${systemPrompt}\n\n${message}` : message,
          max_tokens: 150,
        });
        reply = response.data.choices[0].text.trim();
      }
    } else if (targetProvider === 'gemini') {
      const genAI = new GoogleGenAI({ apiKey });
      const historyText = history
        .map(entry =>
          entry.role === 'assistant'
            ? `Assistant: ${entry.content}`
            : `User: ${entry.content}`,
        )
        .join('\n');
      const combinedPrompt = [systemPrompt, historyText]
        .filter(Boolean)
        .join('\n\n');
      const response = await genAI.models.generateContent({
        model: targetModel,
        contents: combinedPrompt,
      });
      reply = response.text || '';
    } else if (targetProvider === 'claude') {
      const anthropic = new Anthropic({ apiKey: apiKey });
      const msg = await anthropic.messages.create({
        model: targetModel,
        max_tokens: 1024,
        system: systemPrompt || undefined,
        messages: history,
      });
      reply = msg.content[0].text;
    } else if (targetProvider === 'mistral') {
      const client = new MistralClient(apiKey);
      const messages = systemPrompt
        ? [{ role: 'system', content: systemPrompt }, ...history]
        : history;
      const chatResponse = await client.chat({
        model: targetModel,
        messages,
      });
      reply = chatResponse.choices[0].message.content;
    }

    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO messages (thread_id, role, content, provider, model)
         VALUES (?, ?, ?, ?, ?)`,
        [activeThreadId, 'assistant', reply, targetProvider, targetModel],
        err => {
          if (err) reject(err);
          else resolve();
        },
      );
    });

    await new Promise((resolve, reject) => {
      db.run(
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

    res.json({ reply, threadId: activeThreadId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
