// scripts/createAdmin.js
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Verificar si ya existe
    const existingAdmin = await User.findOne({ email: 'admin@baloncesto.com' });
    if (existingAdmin) {
      console.log('⚠️  El admin ya existe');
      process.exit(0);
    }

    // Crear admin
    const admin = new User({
      username: 'admin',
      email: 'admin@baloncesto.com',
      password: 'admin123', // Cambia esto!
      role: 'admin'
    });

    await admin.save();
    console.log('✅ Usuario admin creado: admin@baloncesto.com / admin123');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createAdmin();