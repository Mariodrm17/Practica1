const express = require('express');
const { authenticateJWT } = require('../middleware/authenticateJWT');

const router = express.Router();

// Verificar acceso al chat
router.get('/', authenticateJWT, (req, res) => {
    res.json({
        success: true,
        message: 'Acceso al chat autorizado',
        user: {
            id: req.user.userId,
            username: req.user.username,
            role: req.user.role
        }
    });
});

// Obtener información del usuario para el chat
router.get('/user-info', authenticateJWT, (req, res) => {
    res.json({
        success: true,
        user: {
            id: req.user.userId,
            username: req.user.username,
            role: req.user.role
        }
    });
});

// Endpoint para obtener historial de chat (si lo implementas)
router.get('/history', authenticateJWT, async (req, res) => {
    try {
        // Aquí podrías implementar la lógica para obtener historial de chat
        // desde una base de datos si decides persistir los mensajes
        
        res.json({
            success: true,
            message: 'Historial de chat (pendiente de implementar)',
            history: []
        });
    } catch (error) {
        console.error('Error obteniendo historial de chat:', error);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo historial de chat'
        });
    }
});

module.exports = router;