import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Application from '../models/application.model.js';
import CVAnalysis from '../models/cv-analysis.model.js';
import Notification from '../models/notification.model.js';
import cvAnalysisService from '../services/cv-analysis.service.js';
import { authMiddleware, authorize } from '../middleware/auth.middleware.js';
import mongoose from 'mongoose';
import Job from '../models/job.model.js';
import JobListing from '../models/Job.js';
import { sendEmail, testEmailConnection } from '../utils/emailService.js';

const router = express.Router();

// Get directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '..', 'uploads', 'resumes');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('Created resumes upload directory at:', uploadDir);
}

// Configure multer for resume uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Create a unique filename with original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'resume-' + uniqueSuffix + ext);
  }
});

// File filter to only allow specific document types
const fileFilter = (req, file, cb) => {
  const allowedFileTypes = ['.pdf', '.doc', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedFileTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, DOC, and DOCX are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB file size limit
  }
});

// Apply for a job (requires authentication)
router.post('/', authMiddleware, upload.single('resume'), async (req, res) => {
  try {
    console.log('\n=== Creating New Application ===');
    console.log('Request body:', req.body);
    console.log('User ID:', req.user?._id);
    
    const { jobId, jobTitle, company, location, name, email, phone, coverLetter } = req.body;
    
    console.log('Looking up job with ID:', jobId);
    
    // Basic validation
    if (!jobId || !mongoose.Types.ObjectId.isValid(jobId)) {
      console.error('Error: Invalid job ID format:', jobId);
      return res.status(400).json({ 
        message: 'Invalid job ID format', 
        providedId: jobId
      });
    }
    
    if (!req.file) {
      console.error('Error: No resume file provided');
      return res.status(400).json({ message: 'Resume file is required' });
    }

    // Verify the job exists - try both Job and JobListing models
    let job = await Job.findById(jobId);
    let modelUsed = 'Job';
    
    // If not found in Job model, try JobListing model
    if (!job) {
      console.log('Job not found in Job model, trying JobListing model');
      job = await JobListing.findById(jobId);
      modelUsed = 'JobListing';
    }
    
    if (!job) {
      console.error('Error: Job not found with ID:', jobId, 'in either model');
      return res.status(404).json({ 
        message: 'Job not found',
        jobId: jobId
      });
    }
    
    console.log(`\nFound job in ${modelUsed} model:`, job._id);

    // Find user's MBTI test results - always get the latest completed test
    let mbtiResult = null;
    let mbtiScores = null;
    let testSession = null;
    
    try {
      console.log('Fetching MBTI test results for user:', req.user._id);
      
      // Find the most recent completed test session
      testSession = await mongoose.model('TestSession').findOne({
        userId: req.user._id,
        status: 'completed'
      }).sort({ updatedAt: -1 });
      
      if (!testSession) {
        console.log('User has not completed MBTI test:', req.user._id);
        return res.status(400).json({ 
          message: 'MBTI test required',
          details: 'You must complete the MBTI test before applying for this job'
        });
      }
      
      // Extract MBTI data from test session
      mbtiResult = testSession.lastScores?.predictedType || 'UNKNOWN';
      mbtiScores = testSession.lastScores?.dimensionScores || {};
      
      console.log('Found MBTI test results:', { 
        type: mbtiResult, 
        sessionId: testSession._id
      });
    } catch (testSessionError) {
      console.error('Error fetching test session:', testSessionError);
      return res.status(500).json({ 
        message: 'Error retrieving MBTI test results', 
        details: 'Please try again or contact support'
      });
    }

    // Create resume URL
    const resumeUrl = `/uploads/resumes/${req.file.filename}`;
    console.log('\nResume URL:', resumeUrl);

    // Get the CV file path and analyze it immediately
    const cvPath = path.join(__dirname, '..', 'uploads', 'resumes', req.file.filename);
    console.log('Analyzing CV at path:', cvPath);
    
    // Generate CV analysis report
    let analysis = null;
    let scoreResult = { score: 50 }; // Default score if analysis fails
    let cvAnalysisId = null;
    
    try {
      // Generate CV analysis report
      analysis = await cvAnalysisService.generateReport(cvPath);
      
      // Calculate score based on analysis
      scoreResult = cvAnalysisService.calculateCandidateScore(analysis);
      console.log('CV Analysis Score:', scoreResult);
      
      // Create and save CV analysis document
      if (analysis) {
        const cvAnalysisDoc = new CVAnalysis({
          userId: req.user._id,
          resumePath: cvPath,
          analysis: analysis
        });
        
        await cvAnalysisDoc.save();
        cvAnalysisId = cvAnalysisDoc._id;
        console.log('CV Analysis document created with ID:', cvAnalysisId);
      }
    } catch (analysisError) {
      console.error('Error analyzing CV:', analysisError);
      // Continue without analysis if there's an error
    }

    // Create new application with score, analysis and MBTI data
    const applicationData = {
      user: req.user._id, // Add the user ID from the authenticated user
      job: jobId,
      jobTitle: job.title || jobTitle, // Use job title from database if available
      company: job.company || company || '',
      location: job.location || location || '',
      applicant: {
        name,
        email,
        phone,
        resume: resumeUrl
      },
      resumeUrl: resumeUrl, // Add explicit resumeUrl field to match schema
      coverLetter: coverLetter || '',
      status: 'pending',
      score: scoreResult.score || 50,
      cvAnalysis: cvAnalysisId, // Reference to the CV analysis document
      analysis: analysis, // Keep the analysis in the application document for backward compatibility
      mbtiResult: mbtiResult,
      mbtiScores: mbtiScores
    };

    console.log('\nCreating application with data:', {
      user: applicationData.user,
      job: applicationData.job,
      jobTitle: applicationData.jobTitle,
      mbtiType: applicationData.mbtiResult,
      hasResume: !!applicationData.resumeUrl,
      hasCvAnalysis: !!applicationData.cvAnalysis
    });
    
    // Create and save the application
    try {
      const application = new Application(applicationData);
          await application.save();
      
      console.log('\nApplication created successfully with ID:', application._id);
      
      // Create notification for HR
      if (job.postedBy) {
            try {
              const notification = new Notification({
            recipient: job.postedBy,
            type: 'new_application',
            title: 'New Job Application',
            message: `New application received for ${job.title} from ${name} (MBTI: ${mbtiResult})`,
            data: {
                applicationId: application._id,
              jobId: job._id,
              jobTitle: job.title,
              applicantName: name,
              mbtiType: mbtiResult
            }
              });
              await notification.save();
          console.log('Created notification for HR');
        } catch (notificationError) {
          console.error('Error creating notification:', notificationError);
          // Continue even if notification creation fails
        }
      }
      
      res.status(201).json(application);
    } catch (saveError) {
      console.error('Error saving application:', saveError);
      res.status(500).json({ 
        message: 'Error saving application', 
        error: saveError.message,
        details: saveError.message
      });
    }
  } catch (error) {
    console.error('\nError creating application:', error);
    res.status(500).json({ 
      message: 'Error creating application', 
      error: error.message,
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    });
  }
});

// Get all applications for a specific job
router.get('/job/:jobId', authMiddleware, authorize(['hr', 'departmentHead']), async (req, res) => {
  try {
    console.log('\n=== Fetching Applications for Job ===');
    console.log('Job ID:', req.params.jobId);
    
    const applications = await Application.find({ job: req.params.jobId })
      .populate('user', 'name email profilePicture')
      .lean();
    
    console.log(`Found ${applications.length} applications`);
    
    // Log raw applications data
    applications.forEach(app => {
      console.log('Raw application data:', {
        id: app._id,
        name: app.name,
        score: app.score,
        hasAnalysis: !!app.cvAnalysis,
        status: app.status
      });
    });
    
    // Transform applications to include all necessary data
    const transformedApplications = applications.map(app => {
      // Extract key strengths from CV analysis if available
      let keyStrengths = ['No skills data'];
      if (app.cvAnalysis && Array.isArray(app.cvAnalysis.keySkills)) {
        keyStrengths = app.cvAnalysis.keySkills
          .slice(0, 3)
          .map(skill => skill.toLowerCase());
      }
      
      // Ensure score is a number
      const score = typeof app.score === 'number' ? app.score : 50;
      
      return {
        ...app,
        score: score,
        keyStrengths: keyStrengths
      };
    });
    
    console.log('\nTransformed applications:', transformedApplications.map(app => ({
      id: app._id,
      name: app.name,
      score: app.score,
      keyStrengths: app.keyStrengths,
      status: app.status
    })));
    
    // Sort by score in descending order
    const sortedApplications = transformedApplications.sort((a, b) => (b.score || 0) - (a.score || 0));
    
    // Add rankings
    const rankedApplications = sortedApplications.map((app, index) => ({
      ...app,
      rank: index + 1
    }));
    
    console.log('\nFinal ranked applications:', rankedApplications.map(app => ({
      rank: app.rank,
      id: app._id,
      name: app.name,
      score: app.score,
      status: app.status
    })));
    
    res.json(rankedApplications);
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ message: 'Error fetching applications', error: error.message });
  }
});

// Get all applications for the current user
router.get('/my-applications', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    console.log('\n=== Fetching Applications for User ===');
    console.log('User ID:', userId);
    
    // First, try to get all applications with populated job data from JobListing model
    const applications = await Application.find({ user: userId })
      .populate({
        path: 'job',
        // Try both models by using a dynamic model name (Mongoose will try to match)
        // This ensures we capture job data regardless of which model it's stored in
        select: 'title department company location type experienceLevel experience description salary status deadline postedDate createdAt image'
      })
      .sort({ createdAt: -1 }); // Sort by creation date, newest first
    
    console.log('\nFound applications:', applications.length);
    
    // Transform the data with more robust error handling
    const transformedApplications = await Promise.all(applications.map(async (app) => {
      const appObj = app.toObject();
      console.log('\nProcessing application:', appObj._id);
      
      // Get the job data, preferring populated job data over application-stored data
      const jobData = appObj.job || {};
      
      // If job reference exists but no populated data, try to fetch it manually
      let manualJobData = {};
      if (appObj.job && (!jobData.title || !jobData.department)) {
        try {
          // Try JobListing model first
          let job = await mongoose.model('JobListing').findById(appObj.job).lean();
          
          // If not found, try Job model
          if (!job) {
            job = await mongoose.model('Job').findById(appObj.job).lean();
          }
          
          if (job) {
            console.log('Manually fetched job data:', job._id);
            manualJobData = job;
          }
        } catch (jobFetchError) {
          console.error('Error fetching job data manually:', jobFetchError);
        }
      }
      
      // Combine all sources, with priority: manual fetch > populated > application stored
      const combinedJobData = {
        ...appObj,
        ...manualJobData,
        ...jobData
      };
      
      // Get the job image URL
      let imageUrl = null;
      if (combinedJobData.image) {
        // If it's a full URL, use it as is
        if (combinedJobData.image.startsWith('http')) {
          imageUrl = combinedJobData.image;
        } else {
          // Otherwise, construct the URL
          imageUrl = `/uploads/jobs/${combinedJobData.image.split('/').pop()}`;
        }
      }
      
      // Construct the transformed application object
      const transformedApp = {
        _id: appObj._id,
        jobId: appObj.job,
        jobTitle: combinedJobData.title || appObj.jobTitle || 'Unknown Job',
        company: combinedJobData.company || combinedJobData.department || appObj.company || 'Unknown Department',
        location: combinedJobData.location || appObj.location || 'Unknown Location',
        type: combinedJobData.type || combinedJobData.employmentType || appObj.type || 'Full Time',
        image: imageUrl || '/img/job-categories/engineering.jpeg', // Use default image if none available
        applicant: appObj.applicant || { name: 'Unknown Applicant' },
        status: appObj.status || 'pending',
        resumeUrl: appObj.resumeUrl || '',
        createdAt: appObj.createdAt,
        updatedAt: appObj.updatedAt,
        coverLetter: appObj.coverLetter || '',
        score: appObj.score || 0,
        // Include additional job details if available
        experience: combinedJobData.experience || combinedJobData.experienceLevel || 'Not specified',
        description: combinedJobData.description || 'No description available',
        salary: combinedJobData.salary || { min: 0, max: 0 },
        deadline: combinedJobData.deadline,
        postedDate: combinedJobData.postedDate || combinedJobData.createdAt
      };

      console.log('Transformed application:', {
        id: transformedApp._id,
        jobTitle: transformedApp.jobTitle,
        company: transformedApp.company,
        location: transformedApp.location,
        status: transformedApp.status
      });

      return transformedApp;
    }));
    
    console.log('\nSending transformed applications:', transformedApplications.length);
    res.json(transformedApplications);
  } catch (error) {
    console.error('Error fetching user applications:', error);
    res.status(500).json({ message: 'Error fetching user applications', error: error.message });
  }
});

// Add new route to get user notifications
router.get('/notifications', authMiddleware, async (req, res) => {
  try {
    let notifications;
    
    if (req.user.role === 'hr' || req.user.role === 'departmentHead') {
      // For admin users, get notifications for all applications they've updated
      notifications = await Notification.find({})
        .populate('userId', 'name email')
        .populate('applicationId')
        .sort({ createdAt: -1 });
    } else {
      // For regular users, get only their notifications
      notifications = await Notification.find({ 
        userId: req.user._id
      }).sort({ createdAt: -1 });
    }
    
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Error fetching notifications' });
  }
});

// Delete notification
router.delete('/notifications/:notificationId', authMiddleware, async (req, res) => {
  try {
    console.log('Deleting notification:', req.params.notificationId);
    console.log('User ID:', req.user._id);
    console.log('User role:', req.user.role);

    const notification = await Notification.findById(req.params.notificationId);
    
    if (!notification) {
      console.log('Notification not found');
      return res.status(404).json({ message: 'Notification not found' });
    }

    // Check if user owns the notification or is an admin
    if (notification.userId.toString() !== req.user._id.toString() && 
        req.user.role !== 'hr' && req.user.role !== 'departmentHead') {
      console.log('Unauthorized deletion attempt');
      return res.status(403).json({ message: 'Not authorized to delete this notification' });
    }

    await Notification.findByIdAndDelete(req.params.notificationId);
    console.log('Notification deleted successfully');
    
    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Error deleting notification' });
  }
});

// Mark notification as read
router.patch('/notifications/:notificationId', authMiddleware, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.notificationId, userId: req.user._id },
      { read: true },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: 'Error updating notification' });
  }
});

// Mark notification as read (admin version - can mark any notification as read)
router.patch('/admin/notifications/:notificationId', authMiddleware, authorize(['hr', 'departmentHead']), async (req, res) => {
  try {
    console.log(`Admin marking notification ${req.params.notificationId} as read`);
    
    const notification = await Notification.findByIdAndUpdate(
      req.params.notificationId,
      { read: true },
      { new: true }
    );
    
    if (!notification) {
      console.log('Notification not found');
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    console.log('Successfully marked notification as read');
    res.json(notification);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Error updating notification' });
  }
});

// Delete notification (admin version - can delete any notification)
router.delete('/admin/notifications/:notificationId', authMiddleware, authorize(['hr', 'departmentHead']), async (req, res) => {
  try {
    console.log(`Admin deleting notification ${req.params.notificationId}`);
    
    const notification = await Notification.findById(req.params.notificationId);
    
    if (!notification) {
      console.log('Notification not found');
      return res.status(404).json({ message: 'Notification not found' });
    }

    await Notification.findByIdAndDelete(req.params.notificationId);
    console.log('Notification deleted successfully by admin');
    
    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Error deleting notification' });
  }
});

// Update application status
router.patch('/:id/status', authMiddleware, authorize(['hr', 'departmentHead']), async (req, res) => {
  try {
    const { status, departmentHead } = req.body;
    const applicationId = req.params.id;

    console.log('Status update request:', {
      applicationId,
      newStatus: status,
      userId: req.user?._id,
      userRole: req.user?.role
    });

    // Validate request body
    if (!status) {
      return res.status(400).json({ 
        success: false,
        message: 'Status is required' 
      });
    }

    // Validate status value
    const validStatuses = ['pending', 'shortlisted', 'interviewed', 'joined', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
      });
    }

    // Find application and update only the status field
    const application = await Application.findByIdAndUpdate(
      applicationId,
      { $set: { status: status } },
      { 
        new: true,
        runValidators: false // Disable validation since we're only updating status
      }
    ).populate('job').populate('user');
    
    if (!application) {
      console.log('Application not found:', applicationId);
      return res.status(404).json({ 
        success: false,
        message: 'Application not found' 
      });
    }

    console.log('Application status updated:', {
      id: application._id,
      hasUser: !!application.user,
      userId: application.user?._id,
      currentStatus: application.status,
      jobTitle: application.jobTitle,
      company: application.company,
      location: application.location
    });

    // Create notification
    if (application.user) {
      try {
        console.log('Creating notification for application:', {
          applicationId: application._id,
          userId: application.user._id,
          userEmail: application.user.email,
          oldStatus: application.status,
          newStatus: status
        });

        const statusMessages = {
          pending: 'Your application is under review',
          shortlisted: 'Congratulations! You have been shortlisted',
          interviewed: 'Your interview phase has been completed',
          joined: 'Welcome aboard! Your application has been accepted',
          rejected: 'Thank you for your interest. We have decided to move forward with other candidates'
        };

        const notification = new Notification({
          userId: application.user._id,
          title: 'Application Status Update',
          message: statusMessages[status] || `Your application status has been updated to ${status}`,
          type: 'application_status',
          applicationId: application._id,
          read: false
        });

        const savedNotification = await notification.save();
        console.log('Successfully saved notification:', {
          notificationId: savedNotification._id,
          userId: savedNotification.userId,
          createdAt: savedNotification.createdAt
        });

        // Send email notification
        try {
          // Get the recipient email either from the populated user or from the application
          const recipientEmail = application.user.email || application.email;
          
          // Ensure we have all required data for the email template
          const candidateName = application.user.name || application.name || 'Candidate';
          const jobTitle = application.jobTitle || 'the position';
          const companyName = application.company || application.job?.company || 'Our Company';
          const departmentHeadName = departmentHead || req.user.name || 'Department Head';
          
          if (!recipientEmail) {
            console.error('Cannot send email notification: No recipient email address available');
          } else {
            console.log('Attempting to send email notification...');
            const emailResult = await sendEmail(
              recipientEmail,
              'applicationStatus',
              [
                candidateName,
                jobTitle,
                status,
                companyName,
                departmentHeadName
              ]
            );
            console.log('Email notification result:', emailResult);
          }
        } catch (emailError) {
          console.error('Error sending email notification:', emailError);
        }
      } catch (notificationError) {
        console.error('Error creating notification:', {
          error: notificationError.message,
          stack: notificationError.stack,
          applicationId: application._id,
          userId: application.user._id,
          email: application.user.email
        });
      }
    }

    // Return success response
    return res.json({
      success: true,
      message: 'Status updated successfully',
      application: {
        _id: application._id,
        status: application.status,
        updatedAt: application.updatedAt,
        jobTitle: application.jobTitle,
        company: application.company,
        location: application.location
      }
    });

  } catch (error) {
    console.error('Error in status update:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while updating status',
      error: error.message
    });
  }
});

// Get all applications
router.get('/', authMiddleware, authorize(['hr', 'departmentHead']), async (req, res) => {
  try {
    console.log('Fetching applications...');
    console.log('User role:', req.user.role);
    
    const applications = await Application.find()
      .populate({
        path: 'job',
        select: 'title department company location type experienceLevel experience description salary status deadline postedDate createdAt image'
      })
      .populate({
        path: 'user',
        select: 'name email profilePicture'
      })
      .populate({
        path: 'cvAnalysis',
        select: 'analysis'
      })
      .sort({ createdAt: -1 });

    console.log(`Found ${applications.length} applications`);
    
    // Transform the data to match the frontend interface with improved job data
    const transformedApplications = applications.map(app => {
      const appObj = app.toObject();
      console.log('Processing application:', app._id, 'Name:', app.name, 'User:', app.user?.name);
      
      // Get the job data, preferring populated job data over application-stored data
      const jobData = appObj.job || {};
      
      // Get candidate name - from application or user reference
      const candidateName = app.name || (app.user ? app.user.name : 'Unknown Applicant');
      const candidateEmail = app.email || (app.user ? app.user.email : '');
      
      console.log('Candidate information:', {
        id: app._id,
        name: candidateName,
        email: candidateEmail,
        hasUserRef: !!app.user
      });
      
      return {
        _id: app._id,
        job: app.job?._id || '',
        jobTitle: jobData.title || app.jobTitle || 'Unknown Job',
        company: jobData.company || jobData.department || app.company || 'Unknown Department',
        location: jobData.location || app.location || 'Unknown Location',
        user: app.user || null,
        name: candidateName,
        email: candidateEmail,
        phone: app.phone || '',
        resumeUrl: app.resumeUrl || '',
        coverLetter: app.coverLetter || '',
        status: app.status || 'pending',
        source: app.source || 'Direct',
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
        joinedDate: app.joinedDate || null,
        analysis: app.cvAnalysis?.analysis || null // Include analysis if available
      };
    });

    res.json(transformedApplications);
  } catch (error) {
    console.error('Error in GET /applications:', error);
    res.status(500).json({ 
      message: 'Error fetching applications',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Add new route to get CV analysis
router.get('/:id/analysis', authMiddleware, async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('cvAnalysis');
    
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Check if user has permission to view analysis
    if (req.user.role !== 'hr' && req.user.role !== 'departmentHead' && 
        application.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view this analysis' });
    }

    if (!application.cvAnalysis) {
      return res.status(404).json({ message: 'CV analysis not found for this application' });
    }

    res.json(application.cvAnalysis);
  } catch (error) {
    console.error('Error fetching CV analysis:', error);
    res.status(500).json({ message: 'Error fetching CV analysis', error: error.message });
  }
});

// Analyze CV endpoint
router.post('/analyze-cv', authMiddleware, authorize(['hr', 'departmentHead']), async (req, res) => {
  try {
    console.log('Received CV analysis request:', {
      body: req.body,
      user: req.user,
      headers: req.headers
    });

    const { applicationId, resumePath } = req.body;

    if (!applicationId || !resumePath) {
      console.log('Missing required fields:', { applicationId, resumePath });
      return res.status(400).json({
        success: false,
        message: 'Application ID and resume path are required'
      });
    }

    // Get the absolute path of the resume file
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    let absoluteResumePath = path.join(__dirname, '..', resumePath.replace('/api/uploads/', ''));

    console.log('File paths:', {
      resumePath,
      absoluteResumePath,
      exists: fs.existsSync(absoluteResumePath)
    });

    // Check if file exists
    if (!fs.existsSync(absoluteResumePath)) {
      console.log('File not found:', absoluteResumePath);
      // Try alternative paths
      const alternativePath = path.join(__dirname, '..', 'uploads', 'resumes', path.basename(resumePath));
      console.log('Trying alternative path:', alternativePath);
      
      if (fs.existsSync(alternativePath)) {
        console.log('Found file at alternative path');
        absoluteResumePath = alternativePath;
      } else {
        return res.status(404).json({
          success: false,
          message: 'Resume file not found'
        });
      }
    }

    console.log('Generating CV analysis for file:', absoluteResumePath);

    // Generate CV analysis
    const analysis = await cvAnalysisService.generateReport(absoluteResumePath);
    console.log('Analysis generated successfully');

    // Calculate score based on analysis
    const scoreResult = cvAnalysisService.calculateCandidateScore(analysis);
    console.log('Score calculation result:', scoreResult);

    try {
      // First get the application to get the user
      const application = await Application.findById(applicationId);
      if (!application) {
        throw new Error('Application not found');
      }

      // Create and save CV analysis as a separate document
      const cvAnalysisDoc = new CVAnalysis({
        userId: application.user,
        resumePath: absoluteResumePath,
        analysis: analysis
      });
      
      await cvAnalysisDoc.save();
      console.log('CV Analysis document created with ID:', cvAnalysisDoc._id);

      // Update application with analysis ID and score
      const updatedApplication = await Application.findByIdAndUpdate(
        applicationId,
        { 
          cvAnalysis: cvAnalysisDoc._id,
          score: scoreResult.total,
          scoreBreakdown: scoreResult.breakdown
        },
        { new: true }
      );

      if (!updatedApplication) {
        throw new Error('Application not found');
      }

      console.log('Application updated with analysis and score:', {
        id: updatedApplication._id,
        score: updatedApplication.score,
        hasAnalysis: !!updatedApplication.cvAnalysis
      });

      res.json({
        success: true,
        message: 'CV analysis completed successfully',
        analysis: analysis,
        score: scoreResult.total,
        scoreBreakdown: scoreResult.breakdown
      });
    } catch (dbError) {
      console.error('Database error:', dbError);
      res.status(500).json({
        success: false,
        message: 'Error saving analysis to database',
        error: dbError.message
      });
    }
  } catch (error) {
    console.error('Error in CV analysis:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error analyzing CV'
    });
  }
});

// Update the analyze-cv/:id route to handle invalid CVs
router.post('/analyze-cv/:id', authMiddleware, upload.single('resume'), async (req, res) => {
  try {
    const applicationId = req.params.id;
    const application = await Application.findById(applicationId);
    
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }
    
    // Get resume path from the request or use existing
    const resumePath = req.file ? req.file.path : application.resumeUrl;
    
    try {
      // Analyze CV
      const analysis = await cvAnalysisService.generateReport(resumePath);
      
      // Create and save CV analysis as a separate document
      const cvAnalysisDoc = new CVAnalysis({
        userId: application.user,
        resumePath: resumePath,
        analysis: analysis
      });
      
      await cvAnalysisDoc.save();
      console.log('CV Analysis document created with ID:', cvAnalysisDoc._id);
      
      // Update application with analysis reference and score
      application.cvAnalysis = cvAnalysisDoc._id;
      application.score = analysis.score.total;
      application.scoreBreakdown = analysis.score.breakdown;
      
      // Save the updated application with analysis results
      await application.save();
      
      res.status(200).json({ 
        message: 'CV analyzed successfully',
        analysis: analysis,
        score: analysis.score
      });
    } catch (analysisError) {
      console.error('CV Analysis error:', analysisError);
      return res.status(400).json({
        success: false,
        message: analysisError.message || 'Invalid CV file. Please upload a proper resume document.',
        error: 'INVALID_CV'
      });
    }
  } catch (error) {
    console.error('Error analyzing CV:', error);
    res.status(500).json({ message: 'Error analyzing CV', error: error.message });
  }
});

// Add a new route to manually trigger score recalculation
router.post('/recalculate-scores/:jobId', authMiddleware, authorize(['hr', 'departmentHead']), async (req, res) => {
  try {
    const applications = await Application.find({ job: req.params.jobId });
    
    for (const application of applications) {
      try {
        // Get the CV file path
        const cvPath = path.join(__dirname, '..', application.resumeUrl);
        
        // Generate CV analysis report
        const analysis = await cvAnalysisService.generateReport(cvPath);
        
        // Calculate score based on analysis
        const scoreResult = cvAnalysisService.calculateCandidateScore(analysis);
        
        // Create and save CV analysis as a separate document
        const cvAnalysisDoc = new CVAnalysis({
          userId: application.user,
          resumePath: cvPath,
          analysis: analysis
        });
        
        await cvAnalysisDoc.save();
        console.log('CV Analysis document created with ID:', cvAnalysisDoc._id);
        
        // Update application with score and analysis
        application.score = scoreResult.total;
        application.scoreBreakdown = scoreResult.breakdown;
        application.cvAnalysis = cvAnalysisDoc._id;
        await application.save();
      } catch (error) {
        console.error(`Error recalculating score for application ${application._id}:`, error);
      }
    }
    
    // Return updated applications sorted by score
    const updatedApplications = await Application.find({ job: req.params.jobId })
      .populate('user', 'name email profilePicture')
      .sort({ score: -1 });
    
    res.json(updatedApplications);
  } catch (error) {
    console.error('Error recalculating scores:', error);
    res.status(500).json({ message: 'Error recalculating scores', error: error.message });
  }
});

// Schedule interview
router.post('/:id/schedule-interview', authMiddleware, authorize(['hr', 'departmentHead']), async (req, res) => {
  try {
    const { interviewDate, interviewTime, location } = req.body;
    const applicationId = req.params.id;

    // Validate request body
    if (!interviewDate || !interviewTime || !location) {
      return res.status(400).json({
        success: false,
        message: 'Interview date, time, and location are required'
      });
    }

    // Find application
    const application = await Application.findById(applicationId);
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Update application status to 'interviewed'
    application.status = 'interviewed';
    await application.save();

    // Create notification
    const notification = new Notification({
      userId: application.user,
      title: 'Interview Scheduled',
      message: `Your interview for ${application.jobTitle} has been scheduled for ${interviewDate} at ${interviewTime}`,
      type: 'interview_scheduled',
      applicationId: application._id,
      read: false
    });

    await notification.save();

    // Send email notification
    try {
      await sendEmail(
        application.email,
        'interviewScheduled',
        [
          application.name,
          application.jobTitle,
          application.company,
          interviewDate,
          interviewTime,
          location
        ]
      );
      console.log('Interview email notification sent successfully');
    } catch (emailError) {
      console.error('Error sending interview email notification:', emailError);
    }

    return res.json({
      success: true,
      message: 'Interview scheduled successfully',
      application: {
        _id: application._id,
        status: application.status,
        interviewDate,
        interviewTime,
        location
      }
    });

  } catch (error) {
    console.error('Error scheduling interview:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while scheduling interview',
      error: error.message
    });
  }
});

// Test email configuration
router.get('/test-email', authMiddleware, authorize(['hr', 'departmentHead']), async (req, res) => {
  try {
    console.log('Testing email configuration...');
    
    // Test SMTP connection
    const connectionTest = await testEmailConnection();
    if (!connectionTest) {
      return res.status(500).json({
        success: false,
        message: 'SMTP connection test failed'
      });
    }

    // Send test email
    const testResult = await sendEmail(
      process.env.EMAIL_USER, // Send to the configured email
      'applicationStatus',
      [
        'Test User',
        'Test Job',
        'pending',
        'Test Company'
      ]
    );

    if (testResult) {
      res.json({
        success: true,
        message: 'Test email sent successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send test email'
      });
    }
  } catch (error) {
    console.error('Error in test email endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Error testing email configuration',
      error: error.message
    });
  }
});

// Add a route to update application status
router.patch('/update-status/:id', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const applicationId = req.params.id;
    
    if (!['pending', 'shortlisted', 'interviewed', 'joined', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }
    
    const application = await Application.findByIdAndUpdate(
      applicationId,
      { status: status },
      { new: true }
    );
    
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }
    
    res.status(200).json({ 
      message: 'Application status updated successfully',
      application: application
    });
  } catch (error) {
    console.error('Error updating application status:', error);
    res.status(500).json({ message: 'Error updating application', error: error.message });
  }
});

// Add a route to get ranked candidates
router.get('/ranking', authMiddleware, async (req, res) => {
  try {
    // Get applications with CV analysis and scores
    const applications = await Application.find({
      score: { $ne: null }
    })
    .populate('user', 'name email')
    .populate('job', 'title')
    .sort({ score: -1 }); // Sort by score in descending order
    
    const rankedCandidates = applications.map((app, index) => {
      // Extract key strengths from CV analysis
      const keyStrengths = app.cvAnalysis?.technicalProficiency?.professional || [];
      
      return {
        applicationId: app._id, // Include application ID for future reference
        rank: index + 1,
        candidate: app.name,
        email: app.email,
        score: app.score,
        position: app.jobTitle || (app.job ? app.job.title : 'Not specified'),
        keyStrengths: keyStrengths,
        status: app.status
      };
    });
    
    res.status(200).json(rankedCandidates);
  } catch (error) {
    console.error('Error fetching candidate rankings:', error);
    res.status(500).json({ message: 'Error fetching rankings', error: error.message });
  }
});

// Add a route to get a single application by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const applicationId = req.params.id;
    
    const application = await Application.findById(applicationId)
      .populate('user', 'name email')
      .populate('job', 'title company location');
    
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }
    
    res.status(200).json(application);
  } catch (error) {
    console.error('Error fetching application:', error);
    res.status(500).json({ message: 'Error fetching application', error: error.message });
  }
});

// Add a route to delete an application
router.delete('/:id', authMiddleware, authorize(['hr', 'departmentHead']), async (req, res) => {
  try {
    const applicationId = req.params.id;
    console.log(`Deleting application with ID: ${applicationId}`);
    
    // Find the application first to verify it exists
    const application = await Application.findById(applicationId);
    
    if (!application) {
      console.log(`Application not found with ID: ${applicationId}`);
      return res.status(404).json({ 
        success: false, 
        message: 'Application not found' 
      });
    }
    
    // Delete any associated notifications
    await Notification.deleteMany({ applicationId });
    console.log(`Deleted associated notifications for application: ${applicationId}`);
    
    // Delete the application
    await Application.findByIdAndDelete(applicationId);
    console.log(`Successfully deleted application with ID: ${applicationId}`);
    
    // Return success response
    res.status(200).json({
      success: true,
      message: 'Application deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting application:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting application',
      error: error.message 
    });
  }
});

// Add a route to clean up duplicate notifications
router.post('/cleanup-notifications', authMiddleware, authorize(['hr', 'departmentHead']), async (req, res) => {
  try {
    console.log('Starting notification cleanup process');
    
    // Get all admin users
    const adminUsers = await mongoose.model('User').find({
      role: { $in: ['hr', 'departmentHead'] }
    });
    
    console.log(`Found ${adminUsers.length} admin users to check for duplicate notifications`);
    
    let totalDuplicatesDeleted = 0;
    let totalUsersProcessed = 0;
    
    // Process each admin user
    for (const adminUser of adminUsers) {
      // Get all new_application notifications for this user
      const allNotifications = await Notification.find({
        userId: adminUser._id,
        type: 'new_application'
      }).sort({ createdAt: -1 });
      
      // Track which combinations we've seen
      const seenCombos = new Map();
      const duplicatesToDelete = [];
      
      // Identify duplicates (same applicant and job)
      for (const notification of allNotifications) {
        // Extract applicant name and job title from message
        const messageMatch = notification.message.match(/(.+) has applied for the (.+) position/);
        
        if (messageMatch) {
          const [_, applicantName, jobTitle] = messageMatch;
          const key = `${applicantName}:${jobTitle}`;
          
          if (seenCombos.has(key)) {
            // This is a duplicate - add to delete list
            duplicatesToDelete.push(notification._id);
          } else {
            // First time seeing this combo
            seenCombos.set(key, notification._id);
          }
        }
      }
      
      // Delete duplicates if any found
      if (duplicatesToDelete.length > 0) {
        await Notification.deleteMany({ _id: { $in: duplicatesToDelete } });
        console.log(`Deleted ${duplicatesToDelete.length} duplicate notifications for admin ${adminUser._id}`);
        totalDuplicatesDeleted += duplicatesToDelete.length;
      }
      
      totalUsersProcessed++;
    }
    
    console.log(`Cleanup completed. Processed ${totalUsersProcessed} users, deleted ${totalDuplicatesDeleted} duplicates`);
    
    res.json({
      success: true,
      message: `Cleanup completed successfully. Deleted ${totalDuplicatesDeleted} duplicate notifications.`
    });
  } catch (error) {
    console.error('Error cleaning up notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Error cleaning up notifications',
      error: error.message
    });
  }
});

// Get all applications for a user
router.get('/user/:userId', authMiddleware, async (req, res) => {
  try {
    const applications = await Application.find({ user: req.params.userId })
      .populate('job', 'title company location')
      .sort({ createdAt: -1 });
    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get application by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('job', 'title company location')
      .populate('user', 'name email');
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }
    res.json(application);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Submit new application - this is redundant with the POST / route above
// but keeping it for backward compatibility
router.post('/', authMiddleware, async (req, res) => {
  try {
    const job = await Job.findById(req.body.job);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    const application = new Application({
      ...req.body,
      user: req.user._id,
      status: 'pending'
    });

    await application.save();
    res.status(201).json(application);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update application status (admin/HR only)
router.put('/:id/status', authMiddleware, authorize(['admin', 'hr']), async (req, res) => {
  try {
    const application = await Application.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }
    res.json(application);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router; 