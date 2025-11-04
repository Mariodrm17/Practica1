const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    // Hacerlo opcional para mensajes del sistema
    required: false
  },
  username: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true,
    maxlength: 500
  },
  room: {
    type: String,
    default: 'general'
  },
  type: {
    type: String,
    enum: ['message', 'system', 'join', 'leave'],
    default: 'message'
  }
}, {
  timestamps: true
});

// Índice para búsquedas eficientes
chatMessageSchema.index({ room: 1, createdAt: -1 });

// Método estático para obtener historial del chat
chatMessageSchema.statics.getChatHistory = function(room = 'general', limit = 50) {
  return this.find({ room })
    .populate('user', 'username role')
    .sort({ createdAt: -1 })
    .limit(limit)
    .then(messages => messages.reverse());
};

// Método virtual para determinar si es mensaje del sistema
chatMessageSchema.virtual('isSystemMessage').get(function() {
  return this.type === 'system' || this.type === 'join' || this.type === 'leave';
});

module.exports = mongoose.model('ChatMessage', chatMessageSchema);