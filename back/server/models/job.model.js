import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    company: {
        type: String,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    requirements: [{
        type: String
    }],
    responsibilities: [{
        type: String
    }],
    employmentType: {
        type: String,
        enum: ['full-time', 'part-time', 'contract', 'internship'],
        required: true
    },
    experienceLevel: {
        type: String,
        enum: ['entry', 'mid-level', 'senior', 'executive'],
        required: true
    },
    salary: {
        min: Number,
        max: Number,
        currency: {
            type: String,
            default: 'USD'
        }
    },
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department'
    },
    status: {
        type: String,
        enum: ['open', 'closed', 'draft'],
        default: 'open'
    },
    postedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    deadline: Date,
    skills: [{
        type: String
    }],
    benefits: [{
        type: String
    }],
    // MBTI-related fields
    requiredTestId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Test'
    },
    requiredMbtiTypes: [{
        type: String
    }],
    minDimensionScores: {
        type: Map,
        of: Number
    }
}, {
    timestamps: true
});

export default mongoose.model('Job', jobSchema); 