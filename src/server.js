require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const socketIo = require("socket.io");
const http = require("http");
const path = require("path");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const chatRoutes = require("./routes/chatRoutes");
const { authenticateJWT } = require("./middleware/authenticateJWT");

// Importar modelos
const Product = require("./models/Product");
const User = require("./models/User");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Conexión a MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/portal_productos", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ Conectado a MongoDB Atlas"))
.catch(err => console.error("❌ Error conectando a MongoDB:", err));

// Rutas
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/chat", chatRoutes);

// Ruta principal para React/Vue si usas frontend framework
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ================== NUEVAS RUTAS DE DEBUG ==================

// Ruta de salud
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "OK", 
    message: "Servidor funcionando correctamente 🏀",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development"
  });
});

// Ruta de debug para verificar productos
app.get("/api/debug/products", async (req, res) => {
  try {
    const products = await Product.find().populate("createdBy", "username email");
    
    res.json({
      message: `✅ Hay ${products.length} productos en la BD`,
      count: products.length,
      products: products.map(p => ({
        id: p._id,
        name: p.name,
        description: p.description,
        price: p.price,
        league: p.league,
        category: p.category,
        stock: p.stock,
        image: p.image,
        createdBy: p.createdBy ? p.createdBy.username : "Sistema",
        createdAt: p.createdAt
      }))
    });
  } catch (error) {
    console.error("❌ Error en /api/debug/products:", error);
    res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined
    });
  }
});

// Ruta para verificar usuarios
app.get("/api/debug/users", async (req, res) => {
  try {
    const users = await User.find().select("-password"); // Excluir passwords
    
    res.json({
      message: `✅ Hay ${users.length} usuarios en la BD`,
      count: users.length,
      users: users.map(u => ({
        id: u._id,
        username: u.username,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt
      }))
    });
  } catch (error) {
    console.error("❌ Error en /api/debug/users:", error);
    res.status(500).json({ error: error.message });
  }
});

// Ruta para verificar estado de la BD
app.get("/api/debug/database", async (req, res) => {
  try {
    const [productsCount, usersCount] = await Promise.all([
      Product.countDocuments(),
      User.countDocuments()
    ]);

    const dbState = mongoose.connection.readyState;
    const dbStates = {
      0: "disconnected",
      1: "connected", 
      2: "connecting",
      3: "disconnecting"
    };

    res.json({
      database: {
        status: dbStates[dbState],
        connection: dbState === 1 ? "✅ Conectado" : "❌ Desconectado"
      },
      collections: {
        products: productsCount,
        users: usersCount
      },
      mongodb: {
        uri: process.env.MONGODB_URI ? "✅ Configurada" : "❌ No configurada",
        environment: process.env.NODE_ENV || "development"
      }
    });
  } catch (error) {
    console.error("❌ Error en /api/debug/database:", error);
    res.status(500).json({ error: error.message });
  }
});

// Ruta para crear un producto de prueba (solo desarrollo)
app.post("/api/debug/create-test-product", async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({ error: "No disponible en producción" });
  }

  try {
    const testProduct = new Product({
      name: "Producto de Prueba 🏀",
      description: "Este es un producto de prueba para verificar que todo funciona",
      price: 99.99,
      category: "Balones",
      league: "NBA",
      stock: 10,
      image: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400",
      createdBy: new mongoose.Types.ObjectId() // ID ficticio para pruebas
    });

    await testProduct.save();
    
    res.json({
      message: "✅ Producto de prueba creado",
      product: {
        id: testProduct._id,
        name: testProduct.name,
        price: testProduct.price,
        league: testProduct.league
      }
    });
  } catch (error) {
    console.error("❌ Error creando producto de prueba:", error);
    res.status(500).json({ error: error.message });
  }
});

// ================== SOCKET.IO PARA CHAT ==================

// Socket.io para chat en tiempo real
io.on("connection", (socket) => {
  console.log("✅ Usuario conectado al chat:", socket.id);

  socket.on("joinChat", (user) => {
    socket.join("chat-room");
    socket.broadcast.to("chat-room").emit("userJoined", user);
    console.log(`👋 ${user.username} se unió al chat`);
  });

  socket.on("sendMessage", (data) => {
    console.log(`💬 Mensaje de ${data.username}: ${data.message}`);
    io.to("chat-room").emit("newMessage", {
      ...data,
      timestamp: new Date().toLocaleTimeString("es-ES", { 
        hour: "2-digit", 
        minute: "2-digit" 
      })
    });
  });

  socket.on("typing", (data) => {
    socket.broadcast.to("chat-room").emit("typing", data);
  });

  socket.on("disconnect", () => {
    console.log("❌ Usuario desconectado del chat:", socket.id);
  });
});

// ================== MANEJO DE ERRORES ==================

// Manejo de rutas no encontradas
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Ruta no encontrada",
    path: req.originalUrl,
    method: req.method,
    availableRoutes: [
      "GET /",
      "GET /api/health",
      "GET /api/debug/products",
      "GET /api/debug/users", 
      "GET /api/debug/database",
      "POST /api/auth/login",
      "POST /api/auth/register",
      "GET /api/auth/verify",
      "GET /api/products",
      "GET /api/products/:id",
      "POST /api/products (admin)",
      "PUT /api/products/:id (admin)",
      "DELETE /api/products/:id (admin)",
      "GET /api/chat"
    ]
  });
});

// Manejo global de errores
app.use((error, req, res, next) => {
  console.error("🔥 Error global:", error);
  res.status(500).json({
    error: "Error interno del servidor",
    message: process.env.NODE_ENV === "development" ? error.message : "Algo salió mal"
  });
});

// ================== INICIAR SERVIDOR ==================

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`🏀 Entorno: ${process.env.NODE_ENV || "development"}`);
  console.log(`📊 MongoDB: ${process.env.MONGODB_URI ? "✅ Configurado" : "❌ No configurado"}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔗 Debug productos: http://localhost:${PORT}/api/debug/products`);
});