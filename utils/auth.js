const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const secret = process.env.JWT_SECRET || 'capricornus-secret-2023';

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, secret, { expiresIn: '8h' });
};

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Acesso não autorizado' });

  try {
    const decoded = jwt.verify(token, secret);
    req.userId = decoded.id;
    next();
  } catch (err) {
    res.status(400).json({ error: 'Token inválido' });
  }
};

module.exports = { generateToken, authMiddleware };