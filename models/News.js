const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  category: { type: String, default: 'geral' },
  imageUrl: { type: String },
  videoUrl: { type: String }, // Novo campo para link do YouTube
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
}, { 
  versionKey: false // Remove o campo __v
});

module.exports = mongoose.model('News', newsSchema);