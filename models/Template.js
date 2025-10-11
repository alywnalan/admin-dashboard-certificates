import mongoose from 'mongoose';

const templateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  description: {
    type: String,
    trim: true
  },
  // Template file information
  fileType: {
    type: String,
    enum: ['html', 'pdf', 'doc', 'docx', 'image'],
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  originalFileName: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number
  },
  // Template configuration
  config: {
    width: { type: Number, default: 800 },
    height: { type: Number, default: 600 },
    orientation: { type: String, enum: ['portrait', 'landscape'], default: 'landscape' },
    fields: [{
      name: { type: String, required: true },
      type: { type: String, enum: ['text', 'image', 'date', 'signature'], default: 'text' },
      position: {
        x: { type: Number, required: true },
        y: { type: Number, required: true },
        width: { type: Number, default: 200 },
        height: { type: Number, default: 30 }
      },
      style: {
        fontSize: { type: Number, default: 14 },
        fontFamily: { type: String, default: 'Arial' },
        color: { type: String, default: '#000000' },
        bold: { type: Boolean, default: false },
        italic: { type: Boolean, default: false }
      }
    }]
  },
  // Optional assets such as images (logos, signatures) stored under /public
  assets: [{
    filename: { type: String },
    path: { type: String },
    type: { type: String, enum: ['logo', 'signature', 'background', 'border'] }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

templateSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const Template = mongoose.model('Template', templateSchema);
export default Template;


