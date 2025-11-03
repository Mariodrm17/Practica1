const express = require('express');
const Product = require('../models/Product');
const { authenticateJWT, requireAdmin } = require('../middleware/authenticateJWT');

const router = express.Router();

// Obtener todos los productos (público)
router.get('/', async (req, res) => {
  try {
    const products = await Product.find().populate('createdBy', 'username');
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Error obteniendo productos' });
  }
});

// Obtener producto por ID (público)
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('createdBy', 'username');
    
    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }
    
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Error obteniendo producto' });
  }
});

// Crear producto (solo admin)
router.post('/', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const product = new Product({
      ...req.body,
      createdBy: req.user.userId
    });
    
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ message: 'Error creando producto' });
  }
});

// Actualizar producto (solo admin)
router.put('/:id', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }
    
    res.json(product);
  } catch (error) {
    res.status(400).json({ message: 'Error actualizando producto' });
  }
});

// Eliminar producto (solo admin)
router.delete('/:id', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }
    
    res.json({ message: 'Producto eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error eliminando producto' });
  }
});

module.exports = router;