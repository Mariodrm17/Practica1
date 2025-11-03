const express = require('express');
const { authenticateJWT } = require('../middleware/authenticateJWT');

const router = express.Router();

// Ruta para obtener la página del chat (protegida)
router.get('/', authenticateJWT, (req, res) => {
  res.json({ message: 'Bienvenido al chat', user: req.user });
});

module.exports = router;