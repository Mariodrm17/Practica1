require('dotenv').config();
const mongoose = require('mongoose');

async function fixAdmin() {
  try {
    console.log('🚀 Iniciando fix para usuario admin...');
    
    // Conectar sin opciones problemáticas
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB Atlas');
    
    // Schema simple y compatible
    const userSchema = new mongoose.Schema({
      username: String,
      email: String,
      password: String,
      role: String
    }, { 
      collection: 'users' // Forzar nombre de colección
    });
    
    const User = mongoose.model('User', userSchema);
    
    // Verificar si el admin ya existe
    const existingAdmin = await User.findOne({ email: 'admin@baloncesto.com' });
    if (existingAdmin) {
      console.log('✅ Admin ya existe:', existingAdmin.email);
      console.log('👑 Role:', existingAdmin.role);
    } else {
      console.log('❌ Admin no encontrado, creando uno nuevo...');
      
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 12);
      
      const newAdmin = new User({
        username: 'admin',
        email: 'admin@baloncesto.com',
        password: hashedPassword,
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      await newAdmin.save();
      console.log('🎉 NUEVO ADMIN CREADO EXITOSAMENTE!');
      console.log('📧 Email: admin@baloncesto.com');
      console.log('🔑 Password: admin123');
    }
    
    // Listar todos los usuarios para verificar
    const allUsers = await User.find({});
    console.log('\n📋 TODOS LOS USUARIOS EN LA BD:');
    allUsers.forEach(user => {
      console.log(`- ${user.email} (${user.role})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    // Cerrar conexión explícitamente
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada');
    process.exit(0); // Forzar salida
  }
}

// Ejecutar solo si es el módulo principal
if (require.main === module) {
  fixAdmin();
}