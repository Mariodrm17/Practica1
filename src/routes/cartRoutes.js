const express = require('express');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { authenticateJWT } = require('../middleware/authenticateJWT');

const router = express.Router();

// Obtener carrito del usuario
router.get('/', authenticateJWT, async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user.userId })
      .populate('items.product', 'name price image category league sizes stock');
    
    if (!cart) {
      cart = new Cart({ user: req.user.userId, items: [] });
      await cart.save();
    }
    
    res.json({
      success: true,
      cart: cart
    });
  } catch (error) {
    console.error('Error obteniendo carrito:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo carrito'
    });
  }
});

// Añadir producto al carrito
router.post('/add', authenticateJWT, async (req, res) => {
  try {
    const { productId, quantity = 1, size = null } = req.body;
    
    // Verificar producto
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }
    
    // Verificar stock
    if (product.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: 'Stock insuficiente'
      });
    }
    
    // Verificar talla si es necesario
    if ((product.category === 'Camisetas' || product.category === 'Calzado') && !size) {
      return res.status(400).json({
        success: false,
        message: 'Selecciona una talla'
      });
    }
    
    if (size && !product.isSizeAvailable(size)) {
      return res.status(400).json({
        success: false,
        message: 'Talla no disponible'
      });
    }
    
    // Buscar o crear carrito
    let cart = await Cart.findOne({ user: req.user.userId });
    if (!cart) {
      cart = new Cart({ user: req.user.userId, items: [] });
    }
    
    // Verificar si el producto ya está en el carrito
    const existingItem = cart.items.find(item => 
      item.product.toString() === productId && item.size === size
    );
    
    if (existingItem) {
      // Actualizar cantidad
      existingItem.quantity += quantity;
      existingItem.price = product.price;
    } else {
      // Añadir nuevo item
      cart.items.push({
        product: productId,
        quantity: quantity,
        size: size,
        price: product.price
      });
    }
    
    await cart.save();
    await cart.populate('items.product', 'name price image category league sizes stock');
    
    res.json({
      success: true,
      message: 'Producto añadido al carrito',
      cart: cart
    });
    
  } catch (error) {
    console.error('Error añadiendo al carrito:', error);
    res.status(500).json({
      success: false,
      message: 'Error añadiendo producto al carrito'
    });
  }
});

// Actualizar cantidad en carrito
router.put('/update/:itemId', authenticateJWT, async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;
    
    if (quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'La cantidad debe ser al menos 1'
      });
    }
    
    const cart = await Cart.findOne({ user: req.user.userId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Carrito no encontrado'
      });
    }
    
    const item = cart.items.id(itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item no encontrado en el carrito'
      });
    }
    
    // Verificar stock
    const product = await Product.findById(item.product);
    if (product.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: 'Stock insuficiente'
      });
    }
    
    item.quantity = quantity;
    await cart.save();
    await cart.populate('items.product', 'name price image category league sizes stock');
    
    res.json({
      success: true,
      message: 'Cantidad actualizada',
      cart: cart
    });
    
  } catch (error) {
    console.error('Error actualizando carrito:', error);
    res.status(500).json({
      success: false,
      message: 'Error actualizando carrito'
    });
  }
});

// Eliminar item del carrito
router.delete('/remove/:itemId', authenticateJWT, async (req, res) => {
  try {
    const { itemId } = req.params;
    
    const cart = await Cart.findOne({ user: req.user.userId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Carrito no encontrado'
      });
    }
    
    cart.items = cart.items.filter(item => item._id.toString() !== itemId);
    await cart.save();
    await cart.populate('items.product', 'name price image category league sizes stock');
    
    res.json({
      success: true,
      message: 'Producto eliminado del carrito',
      cart: cart
    });
    
  } catch (error) {
    console.error('Error eliminando del carrito:', error);
    res.status(500).json({
      success: false,
      message: 'Error eliminando producto del carrito'
    });
  }
});

// Vaciar carrito
router.delete('/clear', authenticateJWT, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.userId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Carrito no encontrado'
      });
    }
    
    cart.items = [];
    await cart.save();
    
    res.json({
      success: true,
      message: 'Carrito vaciado',
      cart: cart
    });
    
  } catch (error) {
    console.error('Error vaciando carrito:', error);
    res.status(500).json({
      success: false,
      message: 'Error vaciando carrito'
    });
  }
});

module.exports = router;