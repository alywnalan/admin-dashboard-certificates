import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true }, // hashed
  phone: { type: String },
  institute: { type: String }, // optional string reference to institute name
  status: { type: String, enum: ['active', 'inactive', 'banned'], default: 'active' },
  isVerified: { type: Boolean, default: false },
  verificationSentAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Virtual to populate certificates (by student email or studentId)
studentSchema.virtual('certificates', {
  ref: 'Certificate',
  localField: 'email',
  foreignField: 'metadata.studentEmail',
  justOne: false
});

studentSchema.set('toJSON', { virtuals: true });

export default mongoose.model('Student', studentSchema);
