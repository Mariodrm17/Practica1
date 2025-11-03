// test-connection.js
require('dotenv').config();
const mongoose = require('mongoose');

async function test() {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ Conectado a MongoDB');

        // Usar el modelo directamente
        const Product = mongoose.model('Product', new mongoose.Schema({
            name: String,
            price: Number,
            league: String
        }));

        const count = await Product.countDocuments();
        console.log(`📦 Total productos en BD: ${count}`);

        if (count > 0) {
            const products = await Product.find().limit(3);
            console.log('📋 Primeros productos:');
            products.forEach(p => {
                console.log(`- ${p.name} (${p.league}) - €${p.price}`);
            });
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

test();