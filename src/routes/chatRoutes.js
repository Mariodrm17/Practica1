const express = require('express');
const ChatMessage = require('../models/ChatMessage');
const { authenticateJWT } = require('../middleware/authenticateJWT');

const router = express.Router();

// Obtener historial del chat
router.get('/history', authenticateJWT, async (req, res) => {
  try {
    const { room = 'general', limit = 50 } = req.query;
    
    const messages = await ChatMessage.getChatHistory(room, parseInt(limit));
    
    res.json({
      success: true,
      messages: messages
    });
  } catch (error) {
    console.error('Error obteniendo historial del chat:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo historial del chat'
    });
  }
});

// Guardar mensaje (usado desde Socket.IO)
router.post('/message', authenticateJWT, async (req, res) => {
  try {
    const { message, room = 'general' } = req.body;
    
    const chatMessage = new ChatMessage({
      user: req.user.userId,
      username: req.user.username,
      message: message,
      room: room,
      type: 'message'
    });
    
    await chatMessage.save();
    
    res.json({
      success: true,
      message: 'Mensaje guardado'
    });
  } catch (error) {
    console.error('Error guardando mensaje:', error);
    res.status(500).json({
      success: false,
      message: 'Error guardando mensaje'
    });
  }
});

module.exports = router;