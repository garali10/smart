import mongoose from 'mongoose';

const departmentHeadSchema = new mongoose.Schema({
  id: {
    type: Number,
    unique: true
  },
  company: {
    type: String,
    required: true
  },
  posted_jobs: [{
    type: Number,
    ref: 'Job'
  }],
  candidatList: [{
    type: Number,
    ref: 'Candidate'
  }]
}, {
  timestamps: true
});

// Add auto-increment for id field
departmentHeadSchema.pre('save', async function(next) {
  if (this.isNew) {
    const lastDepartmentHead = await this.constructor.findOne({}, {}, { sort: { 'id': -1 } });
    this.id = lastDepartmentHead ? lastDepartmentHead.id + 1 : 1;
  }
  next();
});

export default mongoose.model('DepartmentHead', departmentHeadSchema); 