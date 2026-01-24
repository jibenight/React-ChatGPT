const openai = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Anthropic = require('@anthropic-ai/sdk');
const MistralClient = require('@mistralai/mistralai');
const db = require('../models/database');
const cryptoJS = require('crypto-js');

exports.sendMessage = async (req, res) => {
  const { userId, sessionId, message, provider } = req.body;
  const targetProvider = provider || 'openai';

  try {
      const result = await db.get('SELECT api_key FROM api_keys WHERE user_id = ? AND provider = ?', [userId, targetProvider]);

      if (!result) return res.status(400).json({ error: `API key not found for ${targetProvider}` });

      const encryptionKey = process.env.ENCRYPTION_KEY;
      let apiKey;
      try {
          const bytes = cryptoJS.AES.decrypt(result.api_key, encryptionKey);
          apiKey = bytes.toString(cryptoJS.enc.Utf8);
      } catch (e) {
          return res.status(500).json({ error: 'Failed to decrypt API key' });
      }

      if (!apiKey) return res.status(401).json({ error: 'Invalid API key' });

      let reply = '';
      if (targetProvider === 'openai') {
          const configuration = new openai.Configuration({ apiKey });
          const openaiApi = new openai.OpenAIApi(configuration);
          try {
             const response = await openaiApi.createChatCompletion({
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: message }]
             });
             reply = response.data.choices[0].message.content;
          } catch (e) {
             const response = await openaiApi.createCompletion({
                model: "text-davinci-003",
                prompt: message,
                max_tokens: 150
             });
             reply = response.data.choices[0].text.trim();
          }

      } else if (targetProvider === 'gemini') {
          const genAI = new GoogleGenerativeAI(apiKey);
          const model = genAI.getGenerativeModel({ model: "gemini-pro"});
          const result = await model.generateContent(message);
          const response = await result.response;
          reply = response.text();

      } else if (targetProvider === 'claude') {
          const anthropic = new Anthropic({ apiKey: apiKey });
          const msg = await anthropic.messages.create({
              model: "claude-3-opus-20240229",
              max_tokens: 1024,
              messages: [{ role: "user", content: message }],
          });
          reply = msg.content[0].text;

      } else if (targetProvider === 'mistral') {
          const client = new MistralClient(apiKey);
          const chatResponse = await client.chat({
              model: 'mistral-tiny',
              messages: [{ role: 'user', content: message }],
          });
          reply = chatResponse.choices[0].message.content;
      }

      await db.run('INSERT INTO chat_history (user_id, session_id, message) VALUES (?, ?, ?)', [userId, sessionId, message]);
      await db.run('INSERT INTO chat_history (user_id, session_id, message) VALUES (?, ?, ?)', [userId, sessionId, reply]);

      res.json({ reply });
  } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
  }
};
