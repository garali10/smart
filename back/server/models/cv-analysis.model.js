import mongoose from 'mongoose';

const cvAnalysisSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    resumePath: {
        type: String,
        required: true
    },
    analysis: {
        keySkills: [String],
        yearsOfExperience: Number,
        educationLevel: String,
        topStrengths: [String],
        recommendedRoles: [String],
        technicalProficiency: {
            languages: [String],
            frameworks: [String],
            tools: [String]
        },
        softSkills: [String],
        analysis: {
            strengths: String,
            areasForImprovement: String,
            uniqueSellingPoints: String
        }
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

cvAnalysisSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

export default mongoose.model('CVAnalysis', cvAnalysisSchema); 