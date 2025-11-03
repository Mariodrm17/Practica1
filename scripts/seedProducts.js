require('dotenv').config();
const mongoose = require('mongoose');

// Definir el modelo de Product aquí mismo para evitar dependencias
const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    category: {
        type: String,
        required: true
    },
    image: {
        type: String,
        default: ''
    },
    stock: {
        type: Number,
        required: true,
        min: 0
    },
    league: {
        type: String,
        enum: ['NBA', 'ACB', 'Ambas'],
        default: 'NBA'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

const Product = mongoose.model('Product', productSchema);

const products = [
    {
        name: "Balón Oficial NBA Spalding",
        description: "Balón de baloncesto oficial de la NBA, tamaño 7, material de cuero sintético premium",
        price: 89.99,
        category: "Balones",
        image: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400",
        stock: 25,
        league: "NBA"
    },
    {
        name: "Camiseta Lakers LeBron James",
        description: "Camiseta oficial de Los Angeles Lakers, edición legendaria de LeBron James",
        price: 119.99,
        category: "Camisetas",
        image: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400",
        stock: 15,
        league: "NBA"
    },
    {
        name: "Zapatillas Jordan XXXVII",
        description: "Zapatillas de baloncesto Air Jordan XXXVII, tecnología Zoom Air, edición limitada",
        price: 199.99,
        category: "Calzado",
        image: "https://images.unsplash.com/photo-1605348532760-6753d2c43329?w=400",
        stock: 8,
        league: "NBA"
    },
    {
        name: "Balón Oficial ACB Molten",
        description: "Balón oficial de la Liga ACB, tamaño 7, homologado FIBA, gran agarre",
        price: 69.99,
        category: "Balones",
        image: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400",
        stock: 30,
        league: "ACB"
    },
    {
        name: "Camiseta Real Madrid 2024",
        description: "Camiseta oficial del Real Madrid de baloncesto, temporada 2023-2024",
        price: 89.99,
        category: "Camisetas",
        image: "https://images.unsplash.com/photo-1614624532983-1fe212c7d6e5?w=400",
        stock: 20,
        league: "ACB"
    },
    {
        name: "Camiseta FC Barcelona Luka Doncic",
        description: "Camiseta edición especial FC Barcelona, firmada por Luka Doncic",
        price: 149.99,
        category: "Camisetas",
        image: "https://images.unsplash.com/photo-1614624532983-1fe212c7d6e5?w=400",
        stock: 5,
        league: "ACB"
    },
    {
        name: "Canasta Portátil Profesional",
        description: "Canasta de baloncesto portátil, altura regulable, tablero de acrílico",
        price: 299.99,
        category: "Equipamiento",
        image: "https://images.unsplash.com/photo-1504450758481-7338eba7524a?w=400",
        stock: 12,
        league: "Ambas"
    },
    {
        name: "Mochila NBA Team Collection",
        description: "Mochila oficial NBA con compartimentos para balón y zapatillas",
        price: 59.99,
        category: "Accesorios",
        image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400",
        stock: 40,
        league: "NBA"
    },
    {
        name: "Medias Compresión Nike NBA",
        description: "Medias de compresión oficiales NBA, tecnología Dri-FIT, talla única",
        price: 24.99,
        category: "Ropa",
        image: "https://images.unsplash.com/photo-1544966503-7cc5ac882d5b?w=400",
        stock: 60,
        league: "NBA"
    },
    {
        name: "Balón ACB Edición Especial",
        description: "Balón conmemorativo 40 aniversario ACB, edición limitada numerada",
        price: 129.99,
        category: "Balones",
        image: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400",
        stock: 3,
        league: "ACB"
    }
];

async function seedProducts() {
    try {
        // Conectar a MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/portal_productos', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ Conectado a MongoDB');

        // Limpiar productos existentes
        await Product.deleteMany({});
        console.log('🗑️ Productos anteriores eliminados');

        // Crear productos
        await Product.insertMany(products);
        console.log(`🏀 ${products.length} productos de baloncesto creados exitosamente!`);

        // Mostrar resumen
        const nbaProducts = products.filter(p => p.league === 'NBA').length;
        const acbProducts = products.filter(p => p.league === 'ACB').length;
        console.log(`📊 Resumen: ${nbaProducts} productos NBA, ${acbProducts} productos ACB`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

seedProducts();