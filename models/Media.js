const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
  title: { type: String, required: true },
  artist: { type: String, required: true },
  url: { type: String, required: true }, // URL pública do áudio no Cloudinary
  cloudinaryId: { type: String, required: true }, // ID do áudio no Cloudinary
  thumbnailUrl: { type: String }, // URL pública da thumbnail
  thumbnailCloudinaryId: { type: String }, // ID da thumbnail no Cloudinary
  category: { type: String, enum: ['music'], default: 'music' },
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