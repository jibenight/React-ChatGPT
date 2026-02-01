const express = require('express');
const router = express.Router();
const openaiController = require('../controllers/openaiController');

// Route pour obtenir l'historique du chat pour un utilisateur donné
router.get('/history/:userId/:sessionId', openaiController.getHistory);

// Route pour envoyer un message à l'API OpenAI
router.post('/message', openaiController.sendMessage);

// Route pour enregistrer la clé d'API OpenAI cryptée
router.post('/store-api-key', openaiController.storeApiKey);

module.exports = router;
