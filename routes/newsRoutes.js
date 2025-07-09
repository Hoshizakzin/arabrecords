const express = require('express');
const router = express.Router();
const multer = require('multer');
const News = require('../models/News');
const authMiddleware = require('../utils/auth');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');

// Multer com memória (para envio ao Cloudinary)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Apenas imagens JPEG, PNG ou WebP são permitidas!'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Logs de rota
router.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.originalUrl}`);
  next();
});

// GET todas as notícias
router.get('/', async (req, res) => {
  try {
    const news = await News.find().sort({ createdAt: -1 }).populate('author', 'username');
    res.json({ success: true, count: news.length, data: news });
  } catch (error) {
    console.error('❌ Erro ao buscar notícias:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar notícias' });
  }
});

// GET uma notícia
router.get('/:id', async (req, res) => {
  try {
    const newsItem = await News.findById(req.params.id).populate('author', 'username');
    if (!newsItem) {
      return res.status(404).json({ success: false, message: 'Notícia não encontrada' });
    }
    res.json({ success: true, data: newsItem });
  } catch (error) {
    console.error('❌ Erro ao buscar notícia:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar notícia' });
  }
});

// POST criar notícia
router.post('/', authMiddleware, upload.single('image'), async (req, res) => {
  console.log('📦 Dados recebidos:', {
    body: req.body,
    hasFile: !!req.file,
    userId: req.userId
  });

  try {
    const { title, content, category, videoUrl } = req.body;
    if (!title || !content) throw new Error('Título e conteúdo são obrigatórios');

    let uploadedImage = null;
    if (req.file) {
      uploadedImage = await uploadToCloudinary(req.file.buffer, req.file.mimetype, 'news_images');
      console.log('✅ Imagem enviada para Cloudinary:', uploadedImage.secure_url);
    }

    const newNews = new News({
      title,
      content,
      category: category || 'geral',
      videoUrl: videoUrl || null,
      imageUrl: uploadedImage?.secure_url || null,
      imageCloudinaryId: uploadedImage?.public_id || null,
      author: req.userId
    });

    const saved = await newNews.save();
    res.status(201).json({ success: true, message: 'Notícia publicada com sucesso!', data: saved });
  } catch (error) {
    console.error('❌ Erro ao publicar notícia:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT atualizar notícia
router.put('/:id', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { title, content, category, videoUrl } = req.body;
    const news = await News.findById(req.params.id);
    if (!news) return res.status(404).json({ success: false, message: 'Notícia não encontrada' });
    if (news.author.toString() !== req.userId) {
      return res.status(403).json({ success: false, message: 'Permissão negada' });
    }

    if (req.file) {
      if (news.imageCloudinaryId) await deleteFromCloudinary(news.imageCloudinaryId);
      const uploaded = await uploadToCloudinary(req.file.buffer, req.file.mimetype, 'news_images');
      news.imageUrl = uploaded.secure_url;
      news.imageCloudinaryId = uploaded.public_id;
    }

    news.title = title || news.title;
    news.content = content || news.content;
    news.category = category || news.category;
    news.videoUrl = videoUrl !== undefined ? videoUrl : news.videoUrl;

    const updated = await news.save();
    res.json({ success: true, message: 'Notícia atualizada com sucesso!', data: updated });
  } catch (error) {
    console.error('❌ Erro ao atualizar notícia:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE notícia
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const news = await News.findById(req.params.id);
    if (!news) return res.status(404).json({ success: false, message: 'Notícia não encontrada' });

    if (news.imageCloudinaryId) {
      await deleteFromCloudinary(news.imageCloudinaryId);
      console.log('🗑️ Imagem removida do Cloudinary');
    }

    await News.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Notícia removida com sucesso!' });
  } catch (error) {
    console.error('❌ Erro ao remover notícia:', error);
    res.status(500).json({ success: false, message: 'Erro ao remover notícia' });
  }
});

module.exports = router;