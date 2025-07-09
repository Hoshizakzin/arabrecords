const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
  title: { type: String, required: true },
  artist: { type: String, required: true },
  url: { type: String, required: true }, // URL do áudio no Cloudinary
  thumbnailUrl: { type: String },        // URL da imagem no Cloudinary
  cloudinaryId: { type: String },        // ID do arquivo de áudio no Cloudinary
  thumbnailCloudinaryId: { type: String }, // ID da thumbnail no Cloudinary
  category: {
    type: String,
    enum: ['music'],
    default: 'music'
  },
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