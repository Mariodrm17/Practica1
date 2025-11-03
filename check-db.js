// check-db.js
require('dotenv').config();
const mongoose = require('mongoose');

async function checkDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB Atlas');

    const Product = require('./src/models/Product');
    const User = require('./src/models/User');
    
    // Verificar productos
    const products = await Product.find();
    console.log(`📦 Total productos: ${products.length}`);
    
    products.forEach(p => {
      console.log(`- ${p.name} (${p.league}) - €${p.price} - Stock: ${p.stock}`);
    });
    
    // Verificar usuarios
    const users = await User.find();
    console.log(`👥 Total usuarios: ${users.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkDatabase();