const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// ✅ Origem permitida: frontend local, produção (Vercel) e API no Render
const allowedOrigins = [
  'https://arabian-blog.vercel.app',
  'https://arabrecords-api.onrender.com',
  'http://localhost:3000'
];

// ✅ Middleware único de CORS
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('❌ CORS não permitido para esta origem: ' + origin));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

// Middlewares básicos
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Conexão com o MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000
})
.then(() => console.log('✅ MongoDB conectado'))
.catch(err => {
  console.error('❌ Erro ao conectar no MongoDB:', err.message);
  process.exit(1);
});

// Logging básico
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// ✅ Rotas principais
app.use('/api/news', require('./routes/newsRoutes'));
app.use('/api/media', require('./routes/mediaRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/admins', require('./routes/adminRoutes'));

// Health check (útil para Render)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Inicialização do servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});