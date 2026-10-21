const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true }, // Will be hashed now
  role: { type: String, enum: ['Candidate', 'Recruiter', 'Admin'], required: true },
  fullName: { type: String, default: '' },
  
  // Candidate Specific
  skills: { type: String, default: '' },
  resumeUrl: { type: String, default: '' }, // Path to uploaded PDF
  
  // Notifications Array
  notifications: [{
    message: String,
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  }],
  
  joinedAt: { type: Date, default: Date.now }
});

const JobSchema = new mongoose.Schema({
  title: { type: String, required: true },
  department: { type: String, required: true },
  location: { type: String, required: true },
  salary: { type: String, required: true },
  jobType: { type: String, enum: ['Full-Time', 'Part-Time', 'Remote', 'Hybrid'], default: 'Full-Time' },
  description: { type: String, default: '' },
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Tracks which recruiter posted it
  createdAt: { type: Date, default: Date.now },
  applicants: [{ 
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resumeUrl: { type: String }, // Snapshot of the resume they applied with
    status: { 
      type: String, 
      enum: ['Applied', 'Screening', 'Interview', 'Offered', 'Rejected'], 
      default: 'Applied' 
    },
    appliedAt: { type: Date, default: Date.now }
  }]
});

module.exports = {
  User: mongoose.model('User', UserSchema),
  Job: mongoose.model('Job', JobSchema)
};