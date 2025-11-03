const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'El nombre del producto es requerido'],
    trim: true,
    maxlength: [100, 'El nombre no puede tener más de 100 caracteres']
  },
  description: {
    type: String,
    required: [true, 'La descripción es requerida'],
    maxlength: [500, 'La descripción no puede tener más de 500 caracteres']
  },
  price: {
    type: Number,
    required: [true, 'El precio es requerido'],
    min: [0, 'El precio no puede ser negativo'],
    max: [10000, 'El precio no puede ser mayor a 10,000']
  },
  category: {
    type: String,
    required: [true, 'La categoría es requerida'],
    enum: {
      values: ['Balones', 'Camisetas', 'Calzado', 'Equipamiento', 'Accesorios', 'Ropa'],
      message: 'Categoría no válida'
    }
  },
  image: {
    type: String,
    default: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400'
  },
  stock: {
    type: Number,
    required: [true, 'El stock es requerido'],
    min: [0, 'El stock no puede ser negativo'],
    default: 0
  },
  league: {
    type: String,
    required: [true, 'La liga es requerida'],
    enum: {
      values: ['NBA', 'ACB', 'Ambas'],
      message: 'Liga no válida. Usa: NBA, ACB o Ambas'
    },
    default: 'NBA'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El creador es requerido']
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Índices para mejor performance
productSchema.index({ league: 1, category: 1 });
productSchema.index({ price: 1 });
productSchema.index({ createdAt: -1 });

// Método para verificar disponibilidad
productSchema.methods.isAvailable = function() {
  return this.stock > 0 && this.isActive;
};

// Método estático para obtener productos por liga
productSchema.statics.findByLeague = function(league) {
  return this.find({ league, isActive: true });
};

// Método estático para obtener productos en stock
productSchema.statics.findInStock = function() {
  return this.find({ stock: { $gt: 0 }, isActive: true });
};

module.exports = mongoose.model('Product', productSchema);