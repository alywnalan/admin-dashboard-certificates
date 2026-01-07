import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema({
  // Link to student
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  studentEmail: { type: String, required: true, index: true },
  
  // Course info
  courseName: { type: String, required: true },
  courseCode: { type: String },
  institute: { type: String },
  description: { type: String },
  
  // Status tracking
  status: { 
    type: String, 
    enum: ['ongoing', 'completed', 'pending', 'dropped'], 
    default: 'pending'
  },
  
  // Dates
  enrollmentDate: { type: Date, default: Date.now },
  startDate: { type: Date },
  endDate: { type: Date },
  completionDate: { type: Date },
  
  // Progress & Performance
  progress: { type: Number, default: 0, min: 0, max: 100 }, // 0-100%
  score: { type: Number },
  maxScore: { type: Number },
  grade: { type: String }, // A, B, C, etc.
  
  // Associated certificate (if issued)
  certificateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Certificate'
  },
  certificateUUID: { type: String },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

courseSchema.index({ studentId: 1, status: 1 });
courseSchema.index({ studentEmail: 1, status: 1 });

export default mongoose.model('Course', courseSchema);
