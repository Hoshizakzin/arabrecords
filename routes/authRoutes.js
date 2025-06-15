const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { generateToken } = require('../utils/auth');

// Criar admin padrão se não existir (ao iniciar o servidor)
const createDefaultAdmin = async () => {
  try {
    const adminExists = await User.findOne({ username: 'admin' });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await User.create({
        fullName: 'Administrador Padrão',
        username: 'admin',
        password: hashedPassword,
        role: 'admin'
      });
      console.log('✅ Admin padrão criado (usuário: admin, senha: admin123)');
    }
  } catch (err) {
    console.error('Erro ao criar admin padrão:', err);
  }
};

createDefaultAdmin();

// Rota de login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    res.json({ 
      token: generateToken(user._id),
      user: {
        id: user._id,
        fullName: user.fullName,
        username: user.username,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

module.exports = router;