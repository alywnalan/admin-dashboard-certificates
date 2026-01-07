import mongoose from 'mongoose';

const certificateSchema = new mongoose.Schema({
  uuid: { 
    type: String, 
    required: true, 
    unique: true,
    index: true
  },
  student: { 
    type: String, 
    required: true,
    trim: true
  },
  // Reference to Student document (if available)
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    index: true
  },
  // Allow multiple subjects to be attached to a certificate
  subjects: [{
    name: { type: String },
    score: { type: String },
    maxScore: { type: String }
  }],
  course: { 
    type: String, 
    required: true,
    trim: true
  },
  institute: { 
    type: String, 
    required: true,
    trim: true
  },
  date: { 
    type: String, 
    required: true 
  },
  issued: { 
    type: Boolean, 
    default: true 
  },
  generatedByAdmin: {
    type: Boolean,
    default: true,
    required: true
  },
  status: {
    type: String,
    enum: ['issued', 'pending', 'expired', 'revoked'],
    default: 'issued'
  },
  customizations: {
    backgroundColor: { type: String, default: '#fffbe6' },
    logo: { type: String },
    signature1: { type: String },
    signature2: { type: String },
    template: { type: String, default: 'default' }
  },
  validationHistory: [{
    validatedAt: { type: Date, default: Date.now },
    validatedBy: { type: String },
    ipAddress: { type: String },
    userAgent: { type: String }
  }],
  metadata: {
    studentEmail: { type: String },
    studentPhone: { type: String },
    yearOfStudy: { type: String },
    semester: { type: String },
    department: { type: String },
    branch: { type: String },
    courseDuration: { type: String },
    grade: { type: String },
    instructor: { type: String }
  },
  qrCode: {
    data: { type: String },
    image: { type: String }
  },
  blockchain: {
    txId: { type: String },
    network: { type: String, default: 'simulated' },
    anchoredAt: { type: Date }
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

// Update timestamp on save
certificateSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Index for better query performance
certificateSchema.index({ institute: 1, createdAt: -1 });
certificateSchema.index({ student: 1 });
certificateSchema.index({ course: 1 });
certificateSchema.index({ createdAt: 1 });

// Virtual for validation count
certificateSchema.virtual('validationCount').get(function() {
  return this.validationHistory ? this.validationHistory.length : 0;
});

// Virtual for last validation
certificateSchema.virtual('lastValidated').get(function() {
  if (!this.validationHistory || this.validationHistory.length === 0) {
    return null;
  }
  return this.validationHistory[this.validationHistory.length - 1].validatedAt;
});

// Method to add validation record
certificateSchema.methods.addValidation = function(validatedBy, ipAddress, userAgent) {
  this.validationHistory.push({
    validatedAt: new Date(),
    validatedBy: validatedBy || 'anonymous',
    ipAddress: ipAddress,
    userAgent: userAgent
  });
  return this.save();
};

// Method to check if certificate is expired (example: 5 years)
certificateSchema.methods.isExpired = function() {
  const issueDate = new Date(this.date);
  const expiryDate = new Date(issueDate.getFullYear() + 5, issueDate.getMonth(), issueDate.getDate());
  return new Date() > expiryDate;
};

// Ensure virtuals are serialized
certificateSchema.set('toJSON', { virtuals: true });

export default mongoose.model('Certificate', certificateSchema);
