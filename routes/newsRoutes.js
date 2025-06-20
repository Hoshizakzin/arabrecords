const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const News = require('../models/News');
const authMiddleware = require('../utils/auth');

router.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.originalUrl}`);
  next();
});

// Configuração do Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/news/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    console.log('📁 Arquivo recebido:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Apenas imagens JPEG, PNG ou WebP são permitidas!'), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }
});

// Rota para listar todas as notícias
router.get('/', async (req, res) => {
  try {
    const news = await News.find().sort({ createdAt: -1 }).populate('author', 'username');
    res.json({
      success: true,
      count: news.length,
      data: news
    });
  } catch (error) {
    console.error('❌ Erro ao buscar notícias:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar notícias'
    });
  }
});

// Rota para obter uma notícia específica
router.get('/:id', async (req, res) => {
  try {
    const newsItem = await News.findById(req.params.id).populate('author', 'username');
    
    if (!newsItem) {
      return res.status(404).json({
        success: false,
        message: 'Notícia não encontrada'
      });
    }

    res.json({
      success: true,
      data: newsItem
    });
  } catch (error) {
    console.error('❌ Erro ao buscar notícia:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar notícia'
    });
  }
});

// Rota para criar nova notícia
router.post('/', authMiddleware, upload.single('image'), async (req, res) => {
  console.log('📦 Dados recebidos na requisição:', {
    body: req.body,
    file: req.file ? {
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size
    } : null,
    userId: req.userId,
    headers: req.headers
  });

  try {
    if (!req.body.title || !req.body.content) {
      throw new Error('Título e conteúdo são obrigatórios');
    }

    const newNews = new News({
      title: req.body.title,
      content: req.body.content,
      category: req.body.category || 'geral',
      imageUrl: req.file ? `/news/${req.file.filename}` : null,
      videoUrl: req.body.videoUrl || null, // Novo campo
      author: req.userId
    });

    const savedNews = await newNews.save();
    
    res.status(201).json({
      success: true,
      message: 'Notícia publicada com sucesso!',
      data: savedNews
    });

  } catch (error) {
    console.error('❌ Erro ao publicar notícia:', error);
    
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('❌ Erro ao remover arquivo temporário:', err);
      });
    }

    res.status(400).json({
      success: false,
      message: error.message || 'Erro ao processar a notícia'
    });
  }
});

// Rota para atualizar notícia
router.put('/:id', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { title, content, category, videoUrl } = req.body;
    const newsId = req.params.id;

    const existingNews = await News.findById(newsId);
    if (!existingNews) {
      return res.status(404).json({
        success: false,
        message: 'Notícia não encontrada'
      });
    }

    if (existingNews.author.toString() !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'Você não tem permissão para editar esta notícia'
      });
    }

    const updateData = {
      title: title || existingNews.title,
      content: content || existingNews.content,
      category: category || existingNews.category,
      videoUrl: videoUrl !== undefined ? videoUrl : existingNews.videoUrl
    };

    if (req.file) {
      updateData.imageUrl = `/news/${req.file.filename}`;
      if (existingNews.imageUrl) {
        const oldImagePath = path.join(__dirname, '../uploads/news', path.basename(existingNews.imageUrl));
        fs.unlink(oldImagePath, (err) => {
          if (err) console.error('Erro ao remover imagem antiga:', err);
        });
      }
    }

    const updatedNews = await News.findByIdAndUpdate(newsId, updateData, { new: true });

    res.json({
      success: true,
      message: 'Notícia atualizada com sucesso!',
      data: updatedNews
    });

  } catch (error) {
    console.error('❌ Erro ao atualizar notícia:', error);
    
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('❌ Erro ao remover arquivo temporário:', err);
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Erro ao atualizar notícia'
    });
  }
});

// Rota para deletar notícia
// Rota para deletar notícia
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const newsId = req.params.id;
    const newsItem = await News.findById(newsId);

    if (!newsItem) {
      return res.status(404).json({
        success: false,
        message: 'Notícia não encontrada'
      });
    }

    if (newsItem.imageUrl) {
      const imagePath = path.join(__dirname, '../uploads/news', path.basename(newsItem.imageUrl));
      fs.unlink(imagePath, (err) => {
        if (err) console.error('Erro ao remover imagem:', err);
      });
    }

    await News.findByIdAndDelete(newsId);

    res.json({
      success: true,
      message: 'Notícia removida com sucesso!'
    });

  } catch (error) {
    console.error('❌ Erro ao remover notícia:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao remover notícia'
    });
  }
});

module.exports = router;