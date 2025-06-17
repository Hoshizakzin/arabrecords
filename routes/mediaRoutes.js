const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Media = require('../models/Media');
const { authMiddleware } = require('../utils/auth');

// Helper para deletar arquivos com promessa
const deleteFile = (filepath) => {
  return new Promise((resolve) => {
    fs.unlink(filepath, (err) => {
      if (err) console.error(`Erro ao remover arquivo: ${filepath}`, err);
      resolve();
    });
  });
};

// Configuração do Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = file.fieldname === 'thumbnail'
      ? 'uploads/media/thumbnails'
      : 'uploads/media/files';

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'thumbnail') {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      cb(null, allowedTypes.includes(file.mimetype));
    } else {
      const allowedTypes = ['audio/mpeg']; // <-- Apenas arquivos MP3 permitidos
      cb(null, allowedTypes.includes(file.mimetype));
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

      if (!title || !req.files?.file) {
        if (req.files) {
          for (const files of Object.values(req.files)) {
            for (const file of files) {
              await deleteFile(file.path);
            }
          }
        }
        return res.status(400).json({ error: 'Título e arquivo de mídia são obrigatórios' });
      }

      const newMedia = new Media({
        title,
        artist: artist || 'Artista Desconhecido',
        category: category || 'music',
        url: `/uploads/media/files/${req.files.file[0].filename}`,
        thumbnailUrl: req.files.thumbnail
          ? `/uploads/media/thumbnails/${req.files.thumbnail[0].filename}`
          : null,
        duration: duration || 0,
        uploadedBy: req.userId
      });

      await newMedia.save();

      res.status(201).json({
        message: 'Mídia enviada com sucesso!',
        media: newMedia
      });

    } catch (err) {
      if (req.files) {
        for (const files of Object.values(req.files)) {
          for (const file of files) {
            await deleteFile(file.path);
          }
        }
      }
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

      const existingMedia = await Media.findById(mediaId);
      if (!existingMedia) {
        return res.status(404).json({ error: 'Mídia não encontrada' });
      }

      const updateData = {
        title: title || existingMedia.title,
        artist: artist || existingMedia.artist,
        category: category || existingMedia.category,
        duration: duration || existingMedia.duration
      };

      // Atualiza mídia principal
      if (req.files?.file) {
        updateData.url = `/uploads/media/files/${req.files.file[0].filename}`;
        const oldFilePath = path.resolve('uploads/media/files', path.basename(existingMedia.url));
        await deleteFile(oldFilePath);
      }

      // Atualiza thumbnail
      if (req.files?.thumbnail) {
        updateData.thumbnailUrl = `/uploads/media/thumbnails/${req.files.thumbnail[0].filename}`;
        if (existingMedia.thumbnailUrl) {
          const oldThumbPath = path.resolve('uploads/media/thumbnails', path.basename(existingMedia.thumbnailUrl));
          await deleteFile(oldThumbPath);
        }
      }

      const updatedMedia = await Media.findByIdAndUpdate(mediaId, updateData, { new: true });

      res.json({
        message: 'Mídia atualizada com sucesso!',
        media: updatedMedia
      });

    } catch (err) {
      if (req.files) {
        for (const files of Object.values(req.files)) {
          for (const file of files) {
            await deleteFile(file.path);
          }
        }
      }
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

      const filePath = path.resolve('uploads/media/files', path.basename(media.url));
      await deleteFile(filePath);

      if (media.thumbnailUrl) {
        const thumbPath = path.resolve('uploads/media/thumbnails', path.basename(media.thumbnailUrl));
        await deleteFile(thumbPath);
      }

      res.json({ message: 'Mídia removida com sucesso!' });

    } catch (err) {
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

// Registrar e servir download
const sanitize = (str) => str.replace(/[<>:"/\\|?*]+/g, '');

router.get('/download/:id', async (req, res) => {
  try {
    const media = await Media.findById(req.params.id);
    if (!media) {
      return res.status(404).json({ error: 'Mídia não encontrada' });
    }

    const filePath = path.resolve('uploads/media/files', path.basename(media.url));
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Arquivo não encontrado no servidor' });
    }

    // Incrementa contador de downloads
    await Media.findByIdAndUpdate(media._id, { $inc: { downloads: 1 } });

    // Gera nome amigável: Artista - Título.mp3
    const ext = path.extname(filePath);
    const niceName = `${sanitize(media.artist)} - ${sanitize(media.title)}${ext}`;

    // Envia arquivo com o novo nome
    res.download(filePath, niceName);
  } catch (err) {
    console.error('Erro no download:', err);
    res.status(500).json({ error: 'Erro ao realizar download' });
  }
});

module.exports = router;