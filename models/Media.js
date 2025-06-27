const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
  title: { type: String, required: true },
  artist: { type: String, required: true },
  url: { type: String, required: true }, // Caminho do arquivo de áudio
  thumbnailUrl: { type: String }, // Caminho da thumbnail (opcional)
  category: { type: String, enum: ['music'], default: 'music' }, // Removido suporte a vídeos
  duration: {
    type: Number,
    min: [0, 'A duração não pode ser negativa.']
  },
  downloads: { type: Number, default: 0 },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
}, {
  versionKey: false
});

module.exports = mongoose.model('Media', mediaSchema);