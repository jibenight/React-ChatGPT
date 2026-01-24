const OpenAI = require('openai');
const db = require('../models/database');
const bcrypt = require('bcrypt');

exports.getHistory = async (req, res) => {
  const userId = req.params.userId;
  const sessionId = req.params.sessionId;

  try {
    const history = await db.all(
        'SELECT * FROM chat_history WHERE user_id = ? AND session_id = ? ORDER BY timestamp',
        [userId, sessionId]
    );
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
};

exports.sendMessage = async (req, res) => {
  const { userId, sessionId, message } = req.body;

  // Récupérer la clé d'API cryptée pour cet utilisateur
  try {
      const result = await db.get(
        'SELECT api_key FROM api_keys WHERE user_id = ?',
        [userId]
      );

      if (!result) {
        return res.status(400).json({ error: 'API key not found for this user' });
      }

      const encryptedApiKey = result.api_key;

      // Décrypter la clé d'API
      const apiKey = await bcrypt.compare(
        process.env.OPENAI_API_KEY,
        encryptedApiKey,
      );

      if (!apiKey) {
        return res.status(401).json({ error: 'Failed to decrypt API key' });
      }

      // Instanciation par requête pour éviter les conflits (Race Condition)
      const openai = new OpenAI({ apiKey });

      // Construire la prompte avec l'historique du chat
      let history = await db.all(
        'SELECT * FROM chat_history WHERE user_id = ? AND session_id = ? ORDER BY timestamp',
        [userId, sessionId]
      );

      // Conversion de l'historique pour l'API Chat
      const messages = history.map(msg => ({
        role: 'user', // Défaut temporaire
        content: msg.message,
      }));
      messages.push({ role: 'user', content: message });

      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: messages,
        max_tokens: 150,
        temperature: 0.8,
      });

      const reply = response.choices[0].message.content.trim();

      // Enregistrer le message de l'utilisateur et la réponse de l'IA dans la base de données
      await db.run(
        'INSERT INTO chat_history (user_id, session_id, message) VALUES (?, ?, ?)',
        [userId, sessionId, message]
      );

      await db.run(
        'INSERT INTO chat_history (user_id, session_id, message) VALUES (?, ?, ?)',
        [userId, sessionId, reply]
      );

      res.json({ reply: reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send message to OpenAI API' });
  }
};

exports.storeApiKey = async (req, res) => {
  const { userId, apiKey } = req.body;

  try {
    const encryptedApiKey = await bcrypt.hash(apiKey, 10);

    await db.run('INSERT INTO api_keys (user_id, api_key) VALUES (?, ?)', [
      userId,
      encryptedApiKey,
    ]);
    res.status(201).json({ message: 'API key stored successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to store API key' });
  }
};
