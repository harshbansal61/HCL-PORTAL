const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const nodemailer = require('nodemailer'); // NEW: Email Engine

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

const JWT_SECRET = "hcl_portal_production_secret";

// --- FILE UPLOAD CONFIG ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, './uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// --- MOCK EMAIL TRANSPORT (Safe for local testing without crashing) ---
const mailEngine = {
  sendMail: (mailOptions) => {
    console.log(`\n=========================================`);
    console.log(`📧 AUTOMATED EMAIL TRIGGERED!`);
    console.log(`To: ${mailOptions.to}`);
    console.log(`Subject: ${mailOptions.subject}`);
    console.log(`Message: \n${mailOptions.text}`);
    console.log(`=========================================\n`);
  }
};

mongoose.connect('mongodb://127.0.0.1:27017/hcl_portal')
  .then(() => console.log('✅ DB Connected'))
  .catch(err => console.error('DB Error:', err));

const UserSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['Candidate', 'Recruiter'], required: true },
  fullName: { type: String, required: true },
  status: { type: String, default: 'Pending' },
  appliedJob: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', default: null },
  resumeUrl: { type: String, default: null },
  employeeDetails: { employeeId: String, corporateEmail: String },
  messages: [{ sender: String, text: String, timestamp: { type: Date, default: Date.now } }]
});
const User = mongoose.model('User', UserSchema);

const JobSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  location: { type: String, default: 'Not specified' }, 
  salary: { type: String, default: 'Not specified' },   
  isActive: { type: Boolean, default: true }
});
const Job = mongoose.model('Job', JobSchema);

const verifyToken = (req, res, next) => {
  const token = req.header('Authorization');
  if (!token) return res.status(401).json({ error: "Denied" });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); } 
  catch (err) { res.status(400).json({ error: "Invalid Token" }); }
};

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, role, fullName } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: "Email exists" });
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashedPassword, role, fullName });
    await user.save();
    res.status(201).json({ message: "Registered" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user || !(await bcrypt.compare(req.body.password, user.password))) return res.status(401).json({ error: "Invalid credentials" });
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET);
    res.json({ token, user });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/me', verifyToken, async (req, res) => res.json(await User.findById(req.user.id).populate('appliedJob')));
app.get('/api/candidates', verifyToken, async (req, res) => res.json(await User.find({ role: 'Candidate' }).populate('appliedJob')));
app.get('/api/jobs', verifyToken, async (req, res) => res.json(await Job.find({ isActive: true })));

// --- NEW: ANALYTICS ENDPOINT ---
app.get('/api/analytics', verifyToken, async (req, res) => {
  const candidates = await User.find({ role: 'Candidate' });
  const totalJobs = await Job.countDocuments();
  const stats = {
    total: candidates.length,
    hired: candidates.filter(c => c.status === 'Hired').length,
    shortlisted: candidates.filter(c => c.status === 'Shortlisted').length,
    pending: candidates.filter(c => c.status === 'Pending' || c.status === 'Under Review').length,
    totalJobs
  };
  res.json(stats);
});

app.post('/api/jobs', verifyToken, async (req, res) => {
  try {
    const job = new Job(req.body);
    await job.save();
    res.json(job);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/apply/:jobId', verifyToken, upload.single('resume'), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    user.appliedJob = req.params.jobId;
    user.status = 'Under Review';
    if (req.file) user.resumeUrl = `/uploads/${req.file.filename}`;
    await user.save();
    res.json(user);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/recruiter/status/:id', verifyToken, async (req, res) => {
  const { status } = req.body;
  const user = await User.findById(req.params.id);
  user.status = status;
  
  if (status === 'Hired' && !user.employeeDetails?.employeeId) {
    const newEmpId = "HCL-" + Math.floor(100000 + Math.random() * 900000);
    const corpEmail = `${user.fullName.replace(/\s+/g, '').toLowerCase()}@hcltech.com`;
    user.employeeDetails = { employeeId: newEmpId, corporateEmail: corpEmail };
    
    // Trigger Email Automation
    mailEngine.sendMail({
      to: user.email,
      subject: `Welcome to HCLTech, ${user.fullName}!`,
      text: `Congratulations! You have been hired.\nYour new Employee ID is: ${newEmpId}\nYour Corporate Email is: ${corpEmail}\n\nHR will reach out with next steps.`
    });
  }
  await user.save();
  res.json(user);
});

app.post('/api/messages/:id', verifyToken, async (req, res) => {
  const user = await User.findById(req.params.id);
  user.messages.push({ sender: req.user.role, text: req.body.text });
  await user.save();
  res.json(user);
});

app.listen(5000, () => console.log('🚀 Ultimate Server running on 5000'));