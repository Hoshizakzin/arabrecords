const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  category: { type: String, default: 'geral' },
  imageUrl: { type: String },
  imageCloudinaryId: { type: String }, // ⬅️ NOVO CAMPO
  videoUrl: { type: String },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
}, { 
  versionKey: false
});

module.exports = mongoose.model('News', newsSchema);