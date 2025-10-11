import jwt from 'jsonwebtoken';
import { isRevoked, updateActivity } from '../sessions.js';

export default function (req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided.' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const tokenId = decoded.jti;
    if (isRevoked(tokenId)) {
      return res.status(401).json({ message: 'Session revoked. Please login again.' });
    }
    updateActivity(tokenId);
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}
