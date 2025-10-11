import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Template from '../models/Template.js';

const router = express.Router();

// Configure uploads to public/uploads/templates
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '../../public');
const uploadDir = path.join(publicDir, 'uploads', 'templates');

// Ensure directory exists
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${unique}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /\.(html|htm|pdf|doc|docx|jpg|jpeg|png|gif|bmp|svg)$/i;
  if (allowedTypes.test(file.originalname)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only HTML, PDF, DOC, DOCX, and image files are allowed.'), false);
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Upload a new template: expects fields name, description and file field 'template'
router.post('/upload', upload.single('template'), async (req, res) => {
  try {
    const { name, description, fileType } = req.body;
    if (!name || !req.file) {
      return res.status(400).json({ message: 'name and template file are required' });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    const detectedType = getFileType(ext);
    const finalFileType = fileType || detectedType;

    const publicPath = `/public/uploads/templates/${req.file.filename}`;
    const template = new Template({
      name,
      description: description || '',
      fileType: finalFileType,
      filePath: publicPath,
      originalFileName: req.file.originalname,
      fileSize: req.file.size,
      createdBy: req.user?.email || 'admin'
    });

    await template.save();
    return res.status(201).json({ success: true, template });
  } catch (err) {
    console.error('Template upload error:', err);
    return res.status(500).json({ message: 'Server error while uploading template' });
  }
});

function getFileType(ext) {
  const typeMap = {
    '.html': 'html',
    '.htm': 'html',
    '.pdf': 'pdf',
    '.doc': 'doc',
    '.docx': 'docx',
    '.jpg': 'image',
    '.jpeg': 'image',
    '.png': 'image',
    '.gif': 'image',
    '.bmp': 'image',
    '.svg': 'image'
  };
  return typeMap[ext] || 'html';
}

// List templates
router.get('/', async (req, res) => {
  try {
    const templates = await Template.find().sort({ createdAt: -1 });
    return res.json({ success: true, templates });
  } catch (err) {
    console.error('List templates error:', err);
    return res.status(500).json({ message: 'Server error while listing templates' });
  }
});

export default router;


