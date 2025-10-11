import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const instituteSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true
  },
  contact: { 
    type: String, 
    required: true 
  },
  location: { 
    type: String, 
    required: true 
  },
  address: { 
    type: String 
  },
  password: { 
    type: String, 
    required: true 
  },
  type: { 
    type: String, 
    enum: ['college', 'university', 'school', 'training_center', 'online_platform'],
    default: 'college'
  },
  revenue: { 
    type: Number, 
    default: 0 
  },
  courses: [{ 
    type: String 
  }],
  status: { 
    type: String, 
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  website: { 
    type: String 
  },
  description: { 
    type: String 
  },
  capacity: { 
    type: Number 
  },
  accreditation: { 
    type: String 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Hash password before saving
instituteSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Update timestamp on save
instituteSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Method to compare password
instituteSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Virtual for certificate count
instituteSchema.virtual('certificateCount', {
  ref: 'Certificate',
  localField: 'name',
  foreignField: 'institute',
  count: true
});

// Ensure virtuals are serialized
instituteSchema.set('toJSON', { virtuals: true });

export default mongoose.model('Institute', instituteSchema);
