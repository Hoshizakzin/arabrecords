// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Função para gerar token JWT
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'segredo', {
    expiresIn: '1d',
  });
};

// ✅ Criar admin padrão ao iniciar o servidor
const createDefaultAdmin = async () => {
  try {
    const adminExists = await User.findOne({ username: 'admin' });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await User.create({
        fullName: 'Administrador Padrão',
        username: 'admin',
        password: hashedPassword,
        role: 'admin',
      });
      console.log('✅ Admin padrão criado (usuário: admin / senha: admin123)');
    }
  } catch (err) {
    console.error('❌ Erro ao criar admin padrão:', err);
  }
};

// Chamar a função assim que este módulo for carregado
createDefaultAdmin();

// ✅ Rota de login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Buscar usuário no banco
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Verificar senha
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Gerar e enviar token + dados do usuário
    const token = generateToken(user._id);
    res.json({
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        username: user.username,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Erro no login:', err.message);
    res.status(500).json({ error: 'Erro no servidor ao processar o login' });
  }
});

module.exports = router;