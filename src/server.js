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
.catch(err => console.error("❌ Error al conectar a MongoDB:", err));

// Rutas
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/chat", chatRoutes);

// Ruta principal para React/Vue si usas frontend framework
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Socket.io para chat en tiempo real
io.on("connection", (socket) => {
  console.log("Usuario conectado al chat:", socket.id);

  socket.on("joinChat", (user) => {
    socket.join("chat-room");
    socket.broadcast.to("chat-room").emit("userJoined", user);
  });

  socket.on("sendMessage", (data) => {
    io.to("chat-room").emit("newMessage", data);
  });

  socket.on("disconnect", () => {
    console.log("Usuario desconectado del chat:", socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});