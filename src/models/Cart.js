const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  size: {
    type: String,
    required: function() {
      // Solo requerido para productos que tienen tallas
      return this.product?.category === 'Camisetas' || this.product?.category === 'Calzado';
    }
  },
  price: {
    type: Number,
    required: true
  }
});

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  items: [cartItemSchema],
  total: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Calcular total antes de guardar
cartSchema.pre('save', function(next) {
  this.total = this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  next();
});

// Método para añadir producto al carrito
cartSchema.methods.addItem = function(productId, quantity = 1, size = null) {
  const existingItem = this.items.find(item => 
    item.product.toString() === productId.toString() && item.size === size
  );
  
  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    this.items.push({
      product: productId,
      quantity,
      size,
      price: this.productPrice // Se establecerá desde el controlador
    });
  }
};

// Método para eliminar producto del carrito
cartSchema.methods.removeItem = function(itemId) {
  this.items = this.items.filter(item => item._id.toString() !== itemId.toString());
};

// Método para actualizar cantidad
cartSchema.methods.updateQuantity = function(itemId, quantity) {
  const item = this.items.id(itemId);
  if (item && quantity > 0) {
    item.quantity = quantity;
  }
};

// Método para limpiar carrito
cartSchema.methods.clear = function() {
  this.items = [];
};

module.exports = mongoose.model('Cart', cartSchema);