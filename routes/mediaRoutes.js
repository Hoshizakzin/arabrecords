const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Media = require('../models/Media');
const authMiddleware = require('../utils/auth');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const allowedAudioTypes = ['audio/mpeg'];
    if (
      (file.fieldname === 'thumbnail' && allowedImageTypes.includes(file.mimetype)) ||
      (file.fieldname === 'file' && allowedAudioTypes.includes(file.mimetype))
    ) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo inválido'), false);
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
    files: 2
  }
});

// Upload de mídia
router.post('/',
  authMiddleware,
  upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const { title, artist, category, duration } = req.body;
      const file = req.files?.file?.[0];
      const thumbnail = req.files?.thumbnail?.[0];

      if (!title || !file) {
        return res.status(400).json({ error: 'Título e arquivo de mídia são obrigatórios' });
      }

      const uploadedFile = await uploadToCloudinary(file.buffer, file.mimetype, 'media_files');
      const uploadedThumb = thumbnail
        ? await uploadToCloudinary(thumbnail.buffer, thumbnail.mimetype, 'media_thumbnails')
        : null;

      const newMedia = new Media({
        title,
        artist: artist || 'Artista Desconhecido',
        category: category || 'music',
        url: uploadedFile.secure_url,
        thumbnailUrl: uploadedThumb?.secure_url || null,
        cloudinaryId: uploadedFile.public_id,
        thumbnailCloudinaryId: uploadedThumb?.public_id || null,
        duration: duration || 0,
        uploadedBy: req.userId
      });

      await newMedia.save();

      res.status(201).json({
        message: 'Mídia enviada com sucesso!',
        media: newMedia
      });
    } catch (err) {
      console.error('Erro ao enviar mídia:', err);
      res.status(500).json({ error: err.message || 'Erro ao enviar mídia' });
    }
  }
);

// Atualização de mídia
router.put('/:id',
  authMiddleware,
  upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const { title, artist, category, duration } = req.body;
      const mediaId = req.params.id;

      const media = await Media.findById(mediaId);
      if (!media) {
        return res.status(404).json({ error: 'Mídia não encontrada' });
      }

      const file = req.files?.file?.[0];
      const thumbnail = req.files?.thumbnail?.[0];

      if (file) {
        // Remove antigo
        if (media.cloudinaryId) await deleteFromCloudinary(media.cloudinaryId);
        const uploaded = await uploadToCloudinary(file.buffer, file.mimetype, 'media_files');
        media.url = uploaded.secure_url;
        media.cloudinaryId = uploaded.public_id;
      }

      if (thumbnail) {
        if (media.thumbnailCloudinaryId) await deleteFromCloudinary(media.thumbnailCloudinaryId);
        const uploadedThumb = await uploadToCloudinary(thumbnail.buffer, thumbnail.mimetype, 'media_thumbnails');
        media.thumbnailUrl = uploadedThumb.secure_url;
        media.thumbnailCloudinaryId = uploadedThumb.public_id;
      }

      media.title = title || media.title;
      media.artist = artist || media.artist;
      media.category = category || media.category;
      media.duration = duration || media.duration;

      const updated = await media.save();

      res.json({
        message: 'Mídia atualizada com sucesso!',
        media: updated
      });
    } catch (err) {
      console.error('Erro ao atualizar mídia:', err);
      res.status(500).json({ error: err.message || 'Erro ao atualizar mídia' });
    }
  }
);

// Deletar mídia
router.delete('/:id',
  authMiddleware,
  async (req, res) => {
    try {
      const media = await Media.findByIdAndDelete(req.params.id);
      if (!media) {
        return res.status(404).json({ error: 'Mídia não encontrada' });
      }

      if (media.cloudinaryId) await deleteFromCloudinary(media.cloudinaryId);
      if (media.thumbnailCloudinaryId) await deleteFromCloudinary(media.thumbnailCloudinaryId);

      res.json({ message: 'Mídia removida com sucesso!' });
    } catch (err) {
      console.error('Erro ao remover mídia:', err);
      res.status(500).json({ error: err.message || 'Erro ao remover mídia' });
    }
  }
);

// Listar mídias
router.get('/', async (req, res) => {
  try {
    const media = await Media.find().sort({ createdAt: -1 });
    res.json(media);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar mídias' });
  }
});

// Download direto via URL
router.get('/download/:id', async (req, res) => {
  try {
    const media = await Media.findById(req.params.id);
    if (!media) return res.status(404).json({ error: 'Mídia não encontrada' });

    await Media.findByIdAndUpdate(media._id, { $inc: { downloads: 1 } });

    res.redirect(media.url); // Redireciona para a URL do Cloudinary
  } catch (err) {
    console.error('Erro no download:', err);
    res.status(500).json({ error: 'Erro ao realizar download' });
  }
});

module.exports = router;