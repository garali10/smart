// job.model.js (in the models folder)
import mongoose from 'mongoose';

const jobListingSchema = new mongoose.Schema({
  title: { type: String, required: true },
  department: { type: String, required: true },
  location: { type: String, required: true },
  type: { type: String, enum: ['full-time', 'part-time', 'contract', 'internship'], required: true },
  experience: { type: String, required: true },
  description: { type: String, required: true },
  salary: {
    min: { type: Number, required: true },
    max: { type: Number, required: true }
  },
  status: { type: String, enum: ['active', 'draft'], required: true },
  deadline: { type: Date, required: true },
  postedDate: { type: Date, default: Date.now },
  image: { 
    type: String, 
    default: function() {
      // Set default image based on department
      const department = this.department?.toLowerCase();
      if (department) {
        if (department.includes('engineering')) return '/img/job-categories/engineering.jpeg';
        if (department.includes('marketing')) return '/img/job-categories/marketing.jpeg';
        if (department.includes('sales')) return '/img/job-categories/sales.jpeg';
      }
      return '/img/job-categories/engineering.jpeg'; // Default fallback
    }
  }
});

// Add a virtual for full image URL
jobListingSchema.virtual('imageUrl').get(function() {
  if (!this.image) {
    // Set default image based on department
    const department = this.department?.toLowerCase();
    if (department) {
      if (department.includes('engineering')) return '/img/job-categories/engineering.jpeg';
      if (department.includes('marketing')) return '/img/job-categories/marketing.jpeg';
      if (department.includes('sales')) return '/img/job-categories/sales.jpeg';
    }
    return '/img/job-categories/engineering.jpeg';
  }
  return this.image.startsWith('http') ? this.image : `/uploads/jobs/${this.image.split('/').pop()}`;
});

// Ensure virtuals are included in JSON output
jobListingSchema.set('toJSON', { virtuals: true });
jobListingSchema.set('toObject', { virtuals: true });

export default mongoose.model('JobListing', jobListingSchema); 