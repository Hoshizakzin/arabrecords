const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');

// Listar todos os administradores (sem senha)
router.get('/', auth, async (req, res) => {
  try {
    const admins = await User.find({ role: 'admin' }).select('-password');
    res.json(admins);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar administradores' });
  }
});

// Criar novo administrador com fullName
router.post('/', auth, async (req, res) => {
  try {
    const { fullName, username, password } = req.body;

    // Validação simples
    if (!fullName || !username || !password) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(400).json({ error: 'Usuário já existe' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const newAdmin = await User.create({
      fullName,
      username,
      password: hashed,
      role: 'admin'
    });

    res.json({
      id: newAdmin._id,
      fullName: newAdmin.fullName,
      username: newAdmin.username,
      role: newAdmin.role
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar administrador' });
  }
});

// Deletar administrador
router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Administrador não encontrado' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir administrador' });
  }
});

module.exports = router;