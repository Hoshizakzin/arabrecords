const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token ausente' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id; // ← ADICIONE ISTO
    req.user = decoded;      // (opcional)
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token inválido' });
  }
};