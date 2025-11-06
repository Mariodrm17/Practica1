const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Configuración de conexión a MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/basketball_shop';

async function createAdmin() {
    try {
        console.log('🔄 Conectando a la base de datos...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Conectado a MongoDB');

        const User = require('../src/models/User');
        
        // Verificar si ya existe el admin
        const existingAdmin = await User.findOne({ email: 'admin@baloncesto.com' });
        
        if (existingAdmin) {
            console.log('⚠️  El admin ya existe. Actualizando contraseña...');
            // Actualizar la contraseña
            const newPassword = 'admin123'; // CONTRASEÑA NUEVA
            existingAdmin.password = await bcrypt.hash(newPassword, 12);
            await existingAdmin.save();
            console.log('✅ Contraseña del admin actualizada:');
            console.log('   Email: admin@baloncesto.com');
            console.log('   Password: admin123');
        } else {
            console.log('📝 Creando nuevo usuario administrador...');
            const hashedPassword = await bcrypt.hash('admin1234', 12);
            
            const adminUser = new User({
                username: 'admin1',
                email: 'admin1@baloncesto.com',
                password: hashedPassword,
                role: 'admins'
            });
            
            await adminUser.save();
            console.log('✅ Admin creado exitosamente:');
            console.log('   Email: admin@baloncesto.com');
            console.log('   Password: admin1234');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Desconectado de MongoDB');
        process.exit(0);
    }
}

createAdmin();