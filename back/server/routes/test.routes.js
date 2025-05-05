import express from 'express';
import { authMiddleware, authorize } from '../middleware/auth.middleware.js';
import cvAnalysisService from '../services/cv-analysis.service.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import mongoose from 'mongoose';
import TestSession from '../models/TestSession.js';
import { mbtiQuestions } from '../data/mbtiQuestions.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Add a simple diagnostic endpoint that doesn't require authentication
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Test routes are working',
    timestamp: new Date().toISOString()
  });
});

// Get MBTI test status for the logged-in user
router.get('/status/user', authMiddleware, async (req, res) => {
  try {
    console.log('Fetching MBTI test status for user:', req.user._id);
    
    // Find the most recent completed test session for this user
    const testSession = await TestSession.findOne({
      userId: req.user._id,
      status: 'completed'
    }).sort({ updatedAt: -1 });
    
    if (!testSession) {
      console.log('No completed test session found for user');
      return res.status(200).json({
        status: 'not_started',
        message: 'User has not completed an MBTI test'
      });
    }
    
    console.log('Found completed test session:', testSession._id);
    return res.status(200).json({
      status: 'completed',
      completedAt: testSession.updatedAt,
      result: {
        personalityType: testSession.lastScores?.predictedType || 'UNKNOWN',
        dimensionScores: testSession.lastScores?.dimensionScores || {}
      },
      testId: testSession.testId
    });
  } catch (error) {
    console.error('Error fetching MBTI test status:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve MBTI test status',
      error: error.message
    });
  }
});

// Simple test route
router.get('/test', (req, res) => {
  res.json({ message: 'Test route working' });
});

// Get MBTI questions for a test
router.get('/questions', authMiddleware, async (req, res) => {
  try {
    console.log('Fetching MBTI questions for user:', req.user._id);
    
    if (!mbtiQuestions || mbtiQuestions.length === 0) {
      console.error('No MBTI questions found in data file');
      return res.status(404).json({
        success: false,
        message: 'No MBTI questions found'
      });
    }
    
    // Add temporary IDs to questions if they don't have them
    const questionsWithIds = mbtiQuestions.map((q, index) => {
      if (!q._id) {
        return { ...q, _id: `question_${index + 1}` };
      }
      return q;
    });
    
    console.log(`Returning ${questionsWithIds.length} MBTI questions`);
    return res.status(200).json({
      success: true,
      questions: questionsWithIds
    });
  } catch (error) {
    console.error('Error fetching MBTI questions:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve MBTI questions',
      error: error.message
    });
  }
});

// Start a new MBTI test session
router.post('/start', authMiddleware, async (req, res) => {
  try {
    console.log('Starting new MBTI test session for user:', req.user._id);
    
    // Check for existing in-progress session
    const existingSession = await TestSession.findOne({
      userId: req.user._id,
      status: 'in_progress'
    });
    
    if (existingSession) {
      console.log('Found existing in-progress session:', existingSession._id);
      return res.status(200).json({
        success: true,
        message: 'Existing session found',
        sessionId: existingSession._id
      });
    }
    
    // Create a new test session
    const testSession = new TestSession({
      userId: req.user._id,
      testId: new mongoose.Types.ObjectId(), // Generate a random test ID
      status: 'in_progress',
      startTime: new Date(),
      lastActivity: new Date(),
      progress: 0,
      answers: []
    });
    
    await testSession.save();
    console.log('New test session created:', testSession._id);
    
    return res.status(201).json({
      success: true,
      message: 'Test session started successfully',
      sessionId: testSession._id
    });
  } catch (error) {
    console.error('Error starting MBTI test session:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to start test session',
      error: error.message
    });
  }
});

// Submit an answer for the MBTI test
router.post('/answer', authMiddleware, async (req, res) => {
  try {
    const { sessionId, questionId, answer, dimension, value } = req.body;
    console.log('Submitting answer:', { sessionId, questionId, answer, dimension, value });
    
    if (!sessionId || !questionId || !answer || !dimension) {
      console.error('Missing required fields in answer submission');
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    // Find the session
    const session = await TestSession.findById(sessionId);
    
    if (!session) {
      console.error('Test session not found:', sessionId);
      return res.status(404).json({
        success: false,
        message: 'Test session not found'
      });
    }
    
    // Check if session belongs to user
    if (session.userId.toString() !== req.user._id.toString()) {
      console.error('User not authorized to access session:', {
        sessionUserId: session.userId,
        requestUserId: req.user._id
      });
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this test session'
      });
    }
    
    try {
      // Add the answer with default response time if not provided
      // Handle both ObjectId and string questionIds
      session.answers.push({
        questionId: questionId.toString(), // Convert to string to avoid ObjectId casting issues
        selectedOption: answer,
        dimension,
        score: parseInt(value) || 0,
        responseTime: 10, // Default value
        answeredAt: new Date()
      });
      
      // Update session progress using the imported mbtiQuestions
      session.progress = Math.round((session.answers.length / mbtiQuestions.length) * 100);
      session.lastActivity = new Date();
      
      // If all questions are answered, complete the test
      if (session.answers.length >= mbtiQuestions.length) {
        console.log('All questions answered, completing test');
        session.status = 'completed';
        
        // Calculate dimension scores
        const dimensionScores = {
          'E-I': 0,
          'S-N': 0,
          'T-F': 0,
          'J-P': 0
        };
        
        // Sum up scores for each dimension
        session.answers.forEach(answer => {
          if (dimensionScores[answer.dimension] !== undefined) {
            dimensionScores[answer.dimension] += answer.score;
          }
        });
        
        // Determine MBTI type
        let mbtiType = '';
        mbtiType += dimensionScores['E-I'] > 0 ? 'E' : 'I';
        mbtiType += dimensionScores['S-N'] > 0 ? 'S' : 'N';
        mbtiType += dimensionScores['T-F'] > 0 ? 'T' : 'F';
        mbtiType += dimensionScores['J-P'] > 0 ? 'J' : 'P';
        
        // Save results
        session.lastScores = {
          dimensionScores,
          predictedType: mbtiType,
          totalScore: Object.values(dimensionScores).reduce((sum, score) => sum + Math.abs(score), 0)
        };
        
        console.log('Test results:', {
          personalityType: mbtiType,
          dimensionScores
        });
      }
      
      await session.save();
      
      return res.status(200).json({
        success: true,
        message: 'Answer submitted successfully',
        progress: session.progress,
        status: session.status,
        result: session.status === 'completed' ? {
          personalityType: session.lastScores.predictedType,
          dimensionScores: session.lastScores.dimensionScores
        } : null
      });
    } catch (saveError) {
      console.error('Error saving session:', saveError);
      return res.status(500).json({
        success: false,
        message: 'Failed to save answer to session',
        error: saveError.message
      });
    }
  } catch (error) {
    console.error('Error submitting answer:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit answer',
      error: error.message
    });
  }
});

// Test route for CV analysis with sample CV
router.post('/analyze-sample-cv', authMiddleware, authorize(['hr', 'departmentHead']), async (req, res) => {
    try {
        // Get the uploads/resumes directory
        const resumesDir = path.join(__dirname, '..', 'uploads', 'resumes');
        
        // List all files in the resumes directory
        const files = fs.readdirSync(resumesDir);
        
        if (files.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No CV files found in resumes directory. Please upload a CV first.'
            });
        }

        // Use the first CV file found
        const sampleCVPath = path.join(resumesDir, files[0]);
        
        console.log('Analyzing CV:', sampleCVPath);
        const analysis = await cvAnalysisService.generateReport(sampleCVPath);
        
        res.json({
            success: true,
            message: 'CV analysis completed',
            analyzedFile: files[0],
            analysis: analysis
        });
    } catch (error) {
        console.error('Error in CV analysis test:', error);
        res.status(500).json({
            success: false,
            message: 'Error analyzing CV',
            error: error.message
        });
    }
});

// List available CVs
router.get('/list-cvs', authMiddleware, authorize(['hr', 'departmentHead']), async (req, res) => {
    try {
        const resumesDir = path.join(__dirname, '..', 'uploads', 'resumes');
        const files = fs.readdirSync(resumesDir);
        
        res.json({
            success: true,
            message: 'CV files listed successfully',
            files: files
        });
    } catch (error) {
        console.error('Error listing CV files:', error);
        res.status(500).json({
            success: false,
            message: 'Error listing CV files',
            error: error.message
        });
    }
});

export default router; 