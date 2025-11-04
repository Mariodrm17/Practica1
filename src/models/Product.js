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
  // NUEVO: Tallas disponibles
  sizes: {
    type: [String],
    default: function() {
      // Tallas por defecto según categoría
      if (this.category === 'Camisetas') {
        return ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
      } else if (this.category === 'Calzado') {
        return ['38', '39', '40', '41', '42', '43', '44', '45'];
      } else if (this.category === 'Ropa') {
        return ['S', 'M', 'L', 'XL'];
      }
      return []; // Sin tallas para otras categorías
    },
    validate: {
      validator: function(sizes) {
        // Si el producto requiere tallas pero no se proporcionaron
        if ((this.category === 'Camisetas' || this.category === 'Calzado' || this.category === 'Ropa') && 
            (!sizes || sizes.length === 0)) {
          return false;
        }
        return true;
      },
      message: 'Los productos de ropa y calzado deben tener tallas definidas'
    }
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
  },
  // NUEVO: Información adicional para productos
  features: {
    type: [String],
    default: []
  },
  brand: {
    type: String,
    default: 'Oficial'
  },
  material: {
    type: String,
    default: ''
  },
  // NUEVO: Para gestionar popularidad
  views: {
    type: Number,
    default: 0
  },
  sales: {
    type: Number,
    default: 0
  },
  // NUEVO: Valoraciones
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// ================== ÍNDICES PARA MEJOR PERFORMANCE ==================

productSchema.index({ league: 1, category: 1 });
productSchema.index({ price: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ 'rating.average': -1 });
productSchema.index({ stock: 1 });
productSchema.index({ isActive: 1 });

// ================== MÉTODOS DE INSTANCIA ==================

// Verificar disponibilidad
productSchema.methods.isAvailable = function() {
  return this.stock > 0 && this.isActive;
};

// Verificar si una talla está disponible
productSchema.methods.isSizeAvailable = function(size) {
  // Si el producto no tiene tallas, siempre está disponible
  if (!this.sizes || this.sizes.length === 0) {
    return true;
  }
  return this.sizes.includes(size);
};

// Reducir stock
productSchema.methods.decreaseStock = function(quantity = 1) {
  if (this.stock >= quantity) {
    this.stock -= quantity;
    this.sales += quantity;
    return true;
  }
  return false;
};

// Aumentar stock
productSchema.methods.increaseStock = function(quantity = 1) {
  this.stock += quantity;
  return this.stock;
};

// Añadir característica
productSchema.methods.addFeature = function(feature) {
  if (!this.features.includes(feature)) {
    this.features.push(feature);
  }
  return this.features;
};

// Incrementar vistas
productSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.views;
};

// Calcular precio con descuento
productSchema.methods.getDiscountedPrice = function(discountPercentage = 0) {
  if (discountPercentage <= 0 || discountPercentage >= 100) {
    return this.price;
  }
  return this.price * (1 - discountPercentage / 100);
};

// Verificar si es nuevo (menos de 30 días)
productSchema.methods.isNew = function() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return this.createdAt > thirtyDaysAgo;
};

// ================== MÉTODOS ESTÁTICOS ==================

// Obtener productos por liga
productSchema.statics.findByLeague = function(league) {
  return this.find({ league, isActive: true });
};

// Obtener productos en stock
productSchema.statics.findInStock = function() {
  return this.find({ stock: { $gt: 0 }, isActive: true });
};

// Obtener productos por categoría
productSchema.statics.findByCategory = function(category) {
  return this.find({ category, isActive: true });
};

// Obtener productos populares (más vendidos)
productSchema.statics.findPopular = function(limit = 10) {
  return this.find({ isActive: true })
    .sort({ sales: -1, 'rating.average': -1 })
    .limit(limit);
};

// Obtener productos nuevos
productSchema.statics.findNew = function(limit = 10) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  return this.find({ 
    isActive: true,
    createdAt: { $gte: thirtyDaysAgo }
  })
  .sort({ createdAt: -1 })
  .limit(limit);
};

// Obtener productos con descuento (precio menor al original)
productSchema.statics.findDiscounted = function() {
  return this.find({ 
    isActive: true,
    $expr: { $lt: ['$price', '$originalPrice'] }
  });
};

// Buscar productos por texto
productSchema.statics.search = function(query, limit = 20) {
  return this.find({
    isActive: true,
    $or: [
      { name: { $regex: query, $options: 'i' } },
      { description: { $regex: query, $options: 'i' } },
      { brand: { $regex: query, $options: 'i' } }
    ]
  })
  .limit(limit);
};

// Obtener productos por rango de precio
productSchema.statics.findByPriceRange = function(minPrice = 0, maxPrice = 10000) {
  return this.find({
    isActive: true,
    price: { $gte: minPrice, $lte: maxPrice }
  });
};

// Obtener estadísticas de productos
productSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: null,
        totalProducts: { $sum: 1 },
        totalStock: { $sum: '$stock' },
        totalSales: { $sum: '$sales' },
        totalViews: { $sum: '$views' },
        averagePrice: { $avg: '$price' },
        averageRating: { $avg: '$rating.average' },
        categories: { $addToSet: '$category' },
        leagues: { $addToSet: '$league' }
      }
    }
  ]);
  
  return stats[0] || {
    totalProducts: 0,
    totalStock: 0,
    totalSales: 0,
    totalViews: 0,
    averagePrice: 0,
    averageRating: 0,
    categories: [],
    leagues: []
  };
};

// Obtender productos que necesitan reposición (stock bajo)
productSchema.statics.findLowStock = function(threshold = 5) {
  return this.find({
    isActive: true,
    stock: { $lte: threshold, $gt: 0 }
  });
};

// Obtener productos agotados
productSchema.statics.findOutOfStock = function() {
  return this.find({
    isActive: true,
    stock: 0
  });
};

// ================== MIDDLEWARE ==================

// Validar que los productos de ropa y calzado tengan tallas
productSchema.pre('save', function(next) {
  if ((this.category === 'Camisetas' || this.category === 'Calzado' || this.category === 'Ropa') && 
      (!this.sizes || this.sizes.length === 0)) {
    const error = new Error('Los productos de ropa y calzado deben tener al menos una talla definida');
    return next(error);
  }
  next();
});

// Actualizar timestamp antes de guardar
productSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Limpiar datos antes de guardar
productSchema.pre('save', function(next) {
  // Eliminar espacios en blanco
  if (this.name) this.name = this.name.trim();
  if (this.description) this.description = this.description.trim();
  if (this.brand) this.brand = this.brand.trim();
  if (this.material) this.material = this.material.trim();
  
  // Asegurar que el precio tenga 2 decimales
  if (this.price) this.price = Math.round(this.price * 100) / 100;
  
  // Eliminar tallas duplicadas
  if (this.sizes && this.sizes.length > 0) {
    this.sizes = [...new Set(this.sizes)];
  }
  
  next();
});

// ================== VIRTUALES ==================

// Precio formateado
productSchema.virtual('formattedPrice').get(function() {
  return `€${this.price.toFixed(2)}`;
});

// Estado de stock
productSchema.virtual('stockStatus').get(function() {
  if (this.stock === 0) return 'agotado';
  if (this.stock <= 5) return 'bajo stock';
  return 'en stock';
});

// ¿Requiere talla?
productSchema.virtual('requiresSize').get(function() {
  return this.sizes && this.sizes.length > 0;
});

// ================== CONFIGURACIÓN ==================

// Incluir virtuales en JSON
productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Product', productSchema);