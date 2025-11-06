require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function createAdmin() {
  try {
    console.log('🔧 Creando usuario administrador de emergencia...');
    
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Conectado a MongoDB');
    
    // Definir schema temporal
    const userSchema = new mongoose.Schema({
      username: String,
      email: String, 
      password: String,
      role: String
    });
    
    const User = mongoose.model('User', userSchema);
    
    // Verificar si ya existe
    const existingAdmin = await User.findOne({ email: 'admin@baloncesto.com' });
    if (existingAdmin) {
      console.log('⚠️  El usuario admin ya existe');
      console.log('📧 Email:', existingAdmin.email);
      console.log('🔑 Password: admin123');
      process.exit(0);
    }
    
    // Crear nuevo admin
    const adminUser = new User({
      username: 'admin',
      email: 'admin@baloncesto.com',
      password: await bcrypt.hash('admin123', 12),
      role: 'admin'
    });
    
    await adminUser.save();
    
    console.log('🎉 USUARIO ADMIN CREADO EXITOSAMENTE');
    console.log('📧 Email: admin@baloncesto.com');
    console.log('🔑 Password: admin123');
    console.log('👑 Role: admin');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error creando admin:', error);
    process.exit(1);
  }
}

createAdmin();