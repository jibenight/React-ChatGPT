const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const db = require('../models/database');
const bcrypt = require('bcrypt');

// Route pour obtenir l'historique du chat pour un utilisateur donné
router.get('/history/:userId/:sessionId', async (req, res) => {
  const userId = req.params.userId;
  const sessionId = req.params.sessionId;

  try {
    const history = await db.all(
      'SELECT * FROM chat_history WHERE user_id = ? AND session_id = ? ORDER BY timestamp',
      [userId, sessionId],
    );
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

// Route pour envoyer un message à l'API OpenAI
router.post('/message', async (req, res) => {
  const { userId, sessionId, message } = req.body;

  // Récupérer la clé d'API cryptée pour cet utilisateur
  const result = await db.get(
    'SELECT api_key FROM api_keys WHERE user_id = ?',
    [userId],
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
    [userId, sessionId],
  );

  // Conversion de l'historique pour l'API Chat
  // Note: Idéalement, ajoutez une colonne 'role' dans votre DB pour distinguer user/assistant
  const messages = history.map(msg => ({
    role: 'user', // Défaut temporaire
    content: msg.message,
  }));
  messages.push({ role: 'user', content: message });

  try {
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
      [userId, sessionId, message],
    );

    await db.run(
      'INSERT INTO chat_history (user_id, session_id, message) VALUES (?, ?, ?)',
      [userId, sessionId, reply],
    );

    res.json({ reply: reply });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send message to OpenAI API' });
  }
});

// Route pour enregistrer la clé d'API OpenAI cryptée
router.post('/store-api-key', async (req, res) => {
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
});

module.exports = router;
