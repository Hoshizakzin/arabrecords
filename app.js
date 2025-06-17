const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();

const allowedOrigins = [
  'http://localhost:3000',
  'https://arabian-blog.vercel.app'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Não autorizado por CORS'));
    }
  },
  credentials: true
}));


app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Database Connection
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

// Request Logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/news', require('./routes/newsRoutes'));
app.use('/api/media', require('./routes/mediaRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/admins', require('./routes/adminRoutes'));

// Static Files
app.use('/news', express.static(path.join(__dirname, 'uploads/news')));
app.use('/media', express.static(path.join(__dirname, 'uploads/media')));

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Server Start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
