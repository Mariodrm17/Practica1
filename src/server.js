require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const socketIo = require("socket.io");
const http = require("http");
const path = require("path");
const cors = require("cors");

// Importar modelos y rutas
const Product = require("./models/Product");
const User = require("./models/User");
const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const chatRoutes = require("./routes/chatRoutes");
const Cart = require('./models/Cart');
const ChatMessage = require('./models/ChatMessage');
const cartRoutes = require('./routes/cartRoutes');

const app = express();
const server = http.createServer(app);

// Configuración de Socket.IO
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use("/api/cart", cartRoutes);

// Conexión a MongoDB con mejor manejo de errores
console.log('🔗 Intentando conectar a MongoDB Atlas...');

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  retryWrites: true,
  w: 'majority'
})
.then(async () => {
  console.log('✅ Conectado a MongoDB Atlas correctamente');
  console.log('📊 Base de datos:', mongoose.connection.db.databaseName);
  
  // Inicializar datos después de conectar
  await initializeDefaultData();
})
.catch(err => {
  console.error('❌ Error crítico conectando a MongoDB:', err);
  process.exit(1);
});

// Manejo de eventos de conexión
mongoose.connection.on('error', err => {
  console.error('❌ Error de MongoDB:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️  MongoDB desconectado');
});

// ================== INICIALIZACIÓN DE DATOS POR DEFECTO ==================

async function initializeDefaultData() {
  try {
    console.log('🏀 Verificando datos iniciales...');
    
    // Verificar y crear productos si no existen
    const productCount = await Product.countDocuments();
    console.log(`📦 Productos en BD: ${productCount}`);
    
    if (productCount === 0) {
      console.log('🔄 Creando productos de baloncesto...');
      await createDefaultProducts();
    }
    
    // Verificar y crear usuario admin
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount === 0) {
      console.log('👑 Creando usuario administrador...');
      await createDefaultAdmin();
    }
    
    console.log('🎉 Inicialización completada correctamente');
    
  } catch (error) {
    console.error('❌ Error en inicialización:', error);
  }
}

async function createDefaultProducts() {
  try {
    // Crear un usuario temporal para los productos
    let adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      adminUser = await User.findOne();
    }
    
    const createdById = adminUser ? adminUser._id : new mongoose.Types.ObjectId();

    const defaultProducts = [
      {
        name: "Balón Oficial NBA Spalding",
        description: "Balón de baloncesto oficial de la NBA, tamaño 7, material de cuero sintético premium. Ideal para partidos profesionales.",
        price: 89.99,
        category: "Balones",
        image: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400",
        stock: 25,
        league: "NBA",
        createdBy: createdById
      },
      {
        name: "Camiseta Lakers LeBron James",
        description: "Camiseta oficial de Los Angeles Lakers, edición legendaria de LeBron James. Tallas disponibles: S, M, L, XL.",
        price: 119.99,
        category: "Camisetas",
        image: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400",
        stock: 15,
        league: "NBA",
        createdBy: createdById
      },
      {
        name: "Zapatillas Jordan XXXVII",
        description: "Zapatillas de baloncesto Air Jordan XXXVII con tecnología Zoom Air. Edición limitada, máxima comodidad y rendimiento.",
        price: 199.99,
        category: "Calzado",
        image: "https://images.unsplash.com/photo-1605348532760-6753d2c43329?w=400",
        stock: 8,
        league: "NBA",
        createdBy: createdById
      },
      {
        name: "Balón Oficial ACB Molten",
        description: "Balón oficial de la Liga ACB, tamaño 7, homologado FIBA. Excelente agarre y durabilidad para competición.",
        price: 69.99,
        category: "Balones",
        image: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400",
        stock: 30,
        league: "ACB",
        createdBy: createdById
      },
      {
        name: "Camiseta Real Madrid 2024",
        description: "Camiseta oficial del Real Madrid de baloncesto, temporada 2023-2024. Diseño exclusivo y materiales de alta calidad.",
        price: 89.99,
        category: "Camisetas",
        image: "https://images.unsplash.com/photo-1614624532983-1fe212c7d6e5?w=400",
        stock: 20,
        league: "ACB",
        createdBy: createdById
      },
      {
        name: "Camiseta FC Barcelona",
        description: "Camiseta edición especial FC Barcelona. Diseño clásico con tecnología de secado rápido.",
        price: 84.99,
        category: "Camisetas",
        image: "https://images.unsplash.com/photo-1614624532983-1fe212c7d6e5?w=400",
        stock: 18,
        league: "ACB",
        createdBy: createdById
      },
      {
        name: "Canasta Portátil Profesional",
        description: "Canasta de baloncesto portátil profesional, altura regulable (2.20m - 3.05m), tablero de acrílico de 10mm.",
        price: 299.99,
        category: "Equipamiento",
        image: "https://images.unsplash.com/photo-1504450758481-7338eba7524a?w=400",
        stock: 12,
        league: "Ambas",
        createdBy: createdById
      },
      {
        name: "Mochila NBA Team Collection",
        description: "Mochila oficial NBA con compartimentos especiales para balón y zapatillas. Resistente al agua con múltiples bolsillos.",
        price: 59.99,
        category: "Accesorios",
        image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400",
        stock: 40,
        league: "NBA",
        createdBy: createdById
      },
      {
        name: "Medias Compresión Nike NBA",
        description: "Medias de compresión oficiales NBA, tecnología Dri-FIT. Mejora la circulación y reduce la fatiga muscular.",
        price: 24.99,
        category: "Ropa",
        image: "https://images.unsplash.com/photo-1544966503-7cc5ac882d5b?w=400",
        stock: 60,
        league: "NBA",
        createdBy: createdById
      },
      {
        name: "Balón ACB Edición Aniversario",
        description: "Balón conmemorativo 40 aniversario ACB, edición limitada numerada. Incluye certificado de autenticidad.",
        price: 129.99,
        category: "Balones",
        image: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400",
        stock: 3,
        league: "ACB",
        createdBy: createdById
      }
    ];

    await Product.insertMany(defaultProducts);
    console.log(`✅ ${defaultProducts.length} productos creados exitosamente`);
    
  } catch (error) {
    console.error('❌ Error creando productos:', error);
    throw error;
  }
}

async function createDefaultAdmin() {
  try {
    const bcrypt = require('bcryptjs');
    
    const adminUser = new User({
      username: 'admin',
      email: 'admin@baloncesto.com',
      password: await bcrypt.hash('admin123', 12),
      role: 'admin'
    });
    
    await adminUser.save();
    console.log('✅ Usuario admin creado: admin@baloncesto.com / admin123');
    
  } catch (error) {
    console.error('❌ Error creando admin:', error);
  }
}

// ================== RUTAS ==================

// Usar rutas
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/chat", chatRoutes);

// Ruta de salud mejorada
app.get("/api/health", async (req, res) => {
  try {
    const productCount = await Product.countDocuments();
    const userCount = await User.countDocuments();
    
    res.json({ 
      status: "OK", 
      message: "🚀 Servidor funcionando correctamente",
      timestamp: new Date().toISOString(),
      database: {
        status: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
        products: productCount,
        users: userCount
      },
      environment: process.env.NODE_ENV || "development"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Ruta de debug completa
app.get("/api/debug/database", async (req, res) => {
  try {
    const [products, users, collections] = await Promise.all([
      Product.find().select('name price league stock').limit(5),
      User.find().select('username email role').limit(5),
      mongoose.connection.db.listCollections().toArray()
    ]);
    
    res.json({
      status: "DEBUG_INFO",
      database: {
        name: mongoose.connection.db.databaseName,
        state: mongoose.connection.readyState,
        collections: collections.map(c => c.name)
      },
      counts: {
        products: await Product.countDocuments(),
        users: await User.countDocuments()
      },
      sampleData: {
        products: products,
        users: users
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Ruta para forzar creación de productos (solo desarrollo)
app.post("/api/admin/initialize-products", async (req, res) => {
  try {
    await createDefaultProducts();
    const newCount = await Product.countDocuments();
    
    res.json({
      success: true,
      message: `Productos inicializados correctamente. Total: ${newCount}`,
      count: newCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Ruta principal
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Ruta de diagnóstico
app.get("/debug", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "debug.html"));
});

// ================== SOCKET.IO ==================

io.on("connection", (socket) => {
  console.log("✅ Usuario conectado al chat:", socket.id);

  socket.on("joinChat", async (user) => {
    socket.join("chat-room");
    
    // Guardar mensaje de sistema
    const systemMessage = new ChatMessage({
      user: user.userId,
      username: user.username,
      message: `${user.username} se unió al chat`,
      room: "chat-room",
      type: "join"
    });
    await systemMessage.save();
    
    // Enviar historial del chat
    const chatHistory = await ChatMessage.getChatHistory("chat-room", 50);
    socket.emit("chatHistory", chatHistory);
    
    socket.broadcast.to("chat-room").emit("userJoined", user);
    console.log(`👋 ${user.username} se unió al chat`);
  });

  socket.on("joinChat", (user) => {
    socket.join("chat-room");
    socket.broadcast.to("chat-room").emit("userJoined", user);
    console.log(`👋 ${user.username} se unió al chat`);
  });

  socket.on("sendMessage", async (data) => {
    try {
      console.log(`💬 Mensaje de ${data.username}: ${data.message}`);
      
      // Guardar mensaje en BD
      const chatMessage = new ChatMessage({
        user: data.userId,
        username: data.username,
        message: data.message,
        room: "chat-room",
        type: "message"
      });
      
      await chatMessage.save();

  socket.on("typing", (data) => {
    socket.broadcast.to("chat-room").emit("typing", data);
  });

  socket.on("disconnect", () => {
    console.log("❌ Usuario desconectado del chat:", socket.id);
  });

   io.to("chat-room").emit("newMessage", {
        ...data,
        timestamp: new Date().toLocaleTimeString("es-ES", { 
          hour: "2-digit", 
          minute: "2-digit" 
        }),
        _id: chatMessage._id
      });
    } catch (error) {
      console.error("Error guardando mensaje:", error);
      socket.emit("messageError", { error: "Error enviando mensaje" });
    }
  });
});

// ================== MANEJO DE ERRORES ==================

// Ruta no encontrada
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Ruta no encontrada",
    path: req.originalUrl,
    method: req.method
  });
});

// Manejo global de errores
app.use((error, req, res, next) => {
  console.error("🔥 Error global:", error);
  res.status(500).json({
    error: "Error interno del servidor",
    message: process.env.NODE_ENV === "development" ? error.message : "Contacta al administrador"
  });
});

// ================== INICIAR SERVIDOR ==================

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`\n🎉 ==========================================`);
  console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
  console.log(`🏀 Tienda de Baloncesto NBA/ACB`);
  console.log(`🔗 Health: http://localhost:${PORT}/api/health`);
  console.log(`🔗 Debug: http://localhost:${PORT}/api/debug/database`);
  console.log(`🔗 Frontend: http://localhost:${PORT}`);
  console.log(`🎉 ==========================================\n`);
});

module.exports = app;