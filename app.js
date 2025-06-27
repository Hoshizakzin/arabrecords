const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Origem permitida: frontend local e produção (Vercel)
const allowedOrigins = [
  'http://localhost:3000',
  'https://arabian-blog.vercel.app'
];

// Middleware de CORS
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || origin.includes('vercel.app') || origin.includes('localhost')) {
      callback(null, true);
    } else {
      callback(new Error('Não autorizado por CORS'));
    }
  },
  credentials: true
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
.then(() => console.log('MongoDB connected'))
.catch(err => {
  console.error('MongoDB connection error:', err.message);
  process.exit(1);
});

// Logging básico
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || origin.includes('vercel.app') || origin.includes('localhost')) {
      callback(null, true);
    } else {
      callback(new Error('Não autorizado por CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
};

app.use(cors(corsOptions));

// Rotas principais
app.use('/api/news', require('./routes/newsRoutes'));
app.use('/api/media', require('./routes/mediaRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/admins', require('./routes/adminRoutes'));

// Arquivos estáticos com CORS habilitado
app.use('/news', cors(), express.static(path.join(__dirname, 'uploads/news')));
app.use('/media', cors(), express.static(path.join(__dirname, 'uploads/media')));

// Health check (útil para o Render)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Inicialização do servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});