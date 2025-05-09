import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import './ApplicationProfile.css';
import { FaTimes } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { jwtDecode } from 'jwt-decode';
import Modal from 'react-bootstrap/Modal';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';

interface ApplicationProfileProps {
  application: {
    _id: string;
    name: string;
    email: string;
    phone: string;
    resumeUrl: string;
    coverLetter: string;
    status: string;
    jobTitle: string;
    createdAt: string;
    user?: {
      _id: string;
      profilePicture?: string;
    };
  };
  onClose: () => void;
  onStatusUpdate: (applicationId: string, updatedApplication: any) => void;
  userRole: string;
  onStatusChange: (newStatus: string, interviewDate?: string, interviewTime?: string) => void;
}

interface CVAnalysis {
  summary: string;
  profileType: string;
  keySkills: string[];
  technicalProficiency: {
    [key: string]: string[];  // Dynamic keys based on profile type
  };
  role: {
    primaryRole: string;
    confidence: number;
    profileType: string;
    capabilities: Array<{
      name: string;
      confidence: number;
    }>;
  };
  experience: {
    years: number;
    organizations: string[];
    locations: string[];
  };
  education: {
    level: string;
    institutions: string[];
  };
  score: {
    total: number;
    breakdown?: {
      keySkillsScore: number;
      roleScore: number;
      toolsScore: number;
      experienceScore: number;
      educationScore: number;
      softSkillsScore: number;
      summaryScore: number;
      orgScore: number;
    }
  };
}

const ApplicationProfile: React.FC<ApplicationProfileProps> = ({ application, onClose, onStatusUpdate, userRole, onStatusChange }) => {
  const [status, setStatus] = useState(application.status);
  const [isUpdating, setIsUpdating] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [cvAnalysis, setCvAnalysis] = useState<CVAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const { user } = useAuth();
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewTime, setInterviewTime] = useState('');

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (application.user?._id) {
        try {
          setFetchError(null);
          const response = await api.get(`/users/${application.user._id}`);

          if (response.data?.profilePicture) {
            const cleanPath = response.data.profilePicture
              .replace('/api/uploads/', '')
              .replace('api/uploads/', '')
              .replace('/profile-pictures/', '')
              .replace('profile-pictures/', '');
            
            const filename = cleanPath.split('/').pop() || cleanPath;
            
            const fullUrl = `http://localhost:5001/api/uploads/${filename}`;
            console.log('Setting profile picture URL:', fullUrl);
            setProfilePicture(fullUrl);
          }
        } catch (error: any) {
          console.error('Error fetching user profile:', error);
          setFetchError(error.response?.data?.message || error.message || 'Failed to fetch user profile');
          setProfilePicture(null);
        }
      }
    };

    fetchUserProfile();
  }, [application.user?._id]);

  const statusOptions = [
    { value: 'pending', label: 'Under Review', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    { value: 'shortlisted', label: 'Shortlisted', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    { value: 'interviewed', label: 'Interviewed', color: 'bg-purple-100 text-purple-800 border-purple-200' },
    { value: 'joined', label: 'Joined', color: 'bg-green-100 text-green-800 border-green-200' },
    { value: 'rejected', label: 'Not Selected', color: 'bg-red-100 text-red-800 border-red-200' }
  ];

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return '⏳';
      case 'shortlisted':
        return '📋';
      case 'interviewed':
        return '🗣️';
      case 'joined':
        return '✅';
      case 'rejected':
        return '❌';
      default:
        return '❔';
    }
  };

  const handleStatusChange = async () => {
    if (newStatus === 'interviewed' && (!interviewDate || !interviewTime)) {
      alert('Please provide both interview date and time');
      return;
    }
    try {
      setIsUpdating(true);
      console.log('Attempting to update status:', {
        applicationId: application._id,
        currentStatus: status,
        newStatus: newStatus,
        departmentHead: user?.name,
        interviewDate,
        interviewTime
      });

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await api.patch(
        `/applications/${application._id}/status`,
        { 
          status: newStatus,
          departmentHead: user?.name,
          interviewDate: interviewDate,
          interviewTime: interviewTime
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      console.log('Status update response:', response.data);

      if (response.data.success) {
        setStatus(newStatus);
        onStatusUpdate(application._id, {
          ...application,
          status: newStatus,
          interviewDate: interviewDate,
          interviewTime: interviewTime,
          meetLink: response.data.application.meetLink
        });
        if (onStatusChange) {
          onStatusChange(newStatus, interviewDate, interviewTime);
        }
        setShowStatusModal(false);
        setShowInterviewModal(false);
        setNewStatus('');
        setInterviewDate('');
        setInterviewTime('');
      } else {
        throw new Error(response.data.message || 'Failed to update status');
      }
    } catch (error: any) {
      console.error('Error updating status:', {
        error,
        response: error.response?.data,
        status: error.response?.status
      });
      
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Failed to update application status';

      // Show error in UI
      alert(errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusColor = (currentStatus: string) => {
    const option = statusOptions.find(opt => opt.value === currentStatus);
    return option?.color || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const canManageStatus = userRole === 'departmentHead';

  const getStatusClass = (currentStatus: string) => {
    return status === currentStatus ? 'active' : '';
  };

  const handleAnalyzeCV = async () => {
    try {
      setIsAnalyzing(true);
      setAnalysisError(null);
      
      const resumePath = application.resumeUrl;
      console.log('Analyzing resume at path:', resumePath);

      const response = await api.post('/applications/analyze-cv', {
        applicationId: application._id,
        resumePath: resumePath
      });

      console.log('Analysis response:', response.data);

      if (response.data.success) {
        // Update the local state with the analysis and score
        setCvAnalysis({
          ...response.data.analysis,
          score: {
            total: response.data.score,
            breakdown: response.data.scoreBreakdown
          }
        });

        // Update the parent component's state by calling onStatusUpdate
        if (onStatusUpdate) {
          onStatusUpdate(application._id, {
            ...application,
            analysis: {
              ...response.data.analysis,
              score: {
                total: response.data.score,
                breakdown: response.data.scoreBreakdown
              }
            }
          });
        }
      } else {
        setAnalysisError(response.data.message || 'Failed to analyze CV');
      }
    } catch (error: any) {
      console.error('Error analyzing CV:', error);
      const errorMessage = error.response?.data?.message || 
                         error.message || 
                         'Failed to analyze CV. Please try again.';
      setAnalysisError(errorMessage);
      
      // Log detailed error information
      console.log('Detailed error info:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers
        }
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const renderAnalysisResults = () => {
    if (!cvAnalysis) return null;

    return (
      <div className="cv-analysis-results bg-white rounded-lg shadow-lg p-6 mt-6">
        <h3 className="text-2xl font-semibold mb-6 text-gray-800 border-b pb-2">CV Analysis Results</h3>
        
        {/* Candidate Score */}
        {cvAnalysis.score && (
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-lg font-semibold text-gray-700">Candidate Score:</span>
              <span
                className={`px-4 py-2 rounded-full text-white font-bold text-xl ${
                  cvAnalysis.score.total >= 80
                    ? 'bg-green-500'
                    : cvAnalysis.score.total >= 60
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
              >
                {cvAnalysis.score.total} / 100
              </span>
            </div>
            
            {/* Score Breakdown */}
            {cvAnalysis.score.breakdown && (
              <div className="bg-gray-50 p-4 rounded-lg mt-2">
                <h4 className="text-md font-medium mb-3 text-gray-700">Score Breakdown</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(cvAnalysis.score.breakdown).map(([key, value]) => {
                    // Convert keySkillsScore to Key Skills
                    const label = key
                      .replace(/([A-Z])/g, ' $1') // Add space before capital letters
                      .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
                      .replace('Score', ''); // Remove "Score" suffix
                    
                    return (
                      <div key={key} className="text-center p-2 bg-white rounded border">
                        <div className="text-sm text-gray-600">{label}</div>
                        <div className="text-xl font-semibold">{value}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Profile Type */}
        <div className="analysis-section mb-6">
          <h4 className="text-lg font-semibold mb-3 text-gray-700">Profile Type</h4>
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
            {cvAnalysis.profileType}
          </span>
        </div>

        {/* Summary Section */}
        {cvAnalysis.summary && (
          <div className="analysis-section mb-6">
            <h4 className="text-lg font-semibold mb-3 text-gray-700">Summary</h4>
            <p className="text-gray-600">{cvAnalysis.summary}</p>
          </div>
        )}

        {/* Key Skills Section */}
        {cvAnalysis.keySkills && cvAnalysis.keySkills.length > 0 && (
          <div className="analysis-section mb-6">
            <h4 className="text-lg font-semibold mb-3 text-gray-700">Key Skills</h4>
            <div className="flex flex-wrap gap-2">
              {cvAnalysis.keySkills.map((skill, index) => (
                <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Experience & Education Section */}
        <div className="analysis-section mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="text-lg font-semibold mb-2 text-gray-700">Experience</h4>
            <div className="text-3xl font-bold text-blue-600">
              {cvAnalysis.experience.years} <span className="text-base font-normal text-gray-600">years</span>
            </div>
            {cvAnalysis.experience.organizations.length > 0 && (
              <div className="mt-2">
                <h5 className="font-medium text-gray-700 mb-1">Organizations</h5>
                <ul className="text-sm text-gray-600">
                  {cvAnalysis.experience.organizations.map((org, index) => (
                    <li key={index}>{org}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="text-lg font-semibold mb-2 text-gray-700">Education</h4>
            <div className="text-lg font-medium text-gray-800">
              {cvAnalysis.education.level}
            </div>
            {cvAnalysis.education.institutions.length > 0 && (
              <div className="mt-2">
                <h5 className="font-medium text-gray-700 mb-1">Institutions</h5>
                <ul className="text-sm text-gray-600">
                  {cvAnalysis.education.institutions.map((inst, index) => (
                    <li key={index}>{inst}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Professional Proficiency Section */}
        <div className="analysis-section mb-6">
          <h4 className="text-lg font-semibold mb-3 text-gray-700">Professional Proficiency</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(cvAnalysis.technicalProficiency).map(([category, skills]) => {
              // Special handling for professional/soft skills
              if (category.toLowerCase() === 'professional') {
                return (
                  <div key={category} className="p-4 bg-yellow-50 rounded-lg md:col-span-3">
                    <h5 className="font-medium text-gray-700 mb-3">Professional Traits & Soft Skills</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {skills.map((skill, index) => {
                        // Get description based on soft skill
                        const descriptions: Record<string, string> = {
                          'leadership': 'Ability to guide teams and take initiative',
                          'communication': 'Excellent verbal and written communication',
                          'team work': 'Works well in collaborative environments',
                          'teamwork': 'Works well in collaborative environments',
                          'problem solving': 'Analytical approach to challenges',
                          'adaptability': 'Quickly adapts to changing environments',
                          'time management': 'Efficiently organizes tasks and schedules',
                          'creativity': 'Innovative approach to problems and solutions',
                          'critical thinking': 'Objective analysis and evaluation',
                          'attention to detail': 'Meticulous focus on accuracy',
                          'organization': 'Structured approach to tasks and information',
                          'project management': 'Effectively coordinates people and resources',
                          'negotiation': 'Effectively reaches agreements through discussion',
                          'conflict resolution': 'Resolving disagreements constructively',
                          'customer service': 'Focusing on customer satisfaction',
                          'emotional intelligence': 'Understanding and managing emotions',
                          'decision making': 'Making timely and effective choices',
                          'flexibility': 'Willingness to adapt to different scenarios',
                          'initiative': 'Taking action without being prompted',
                          'interpersonal skills': 'Building productive relationships',
                          'multitasking': 'Handling multiple tasks simultaneously',
                          'networking': 'Building and maintaining professional contacts',
                          'patience': 'Maintaining calm under pressure',
                          'presentation': 'Effectively conveying information to audiences',
                          'public speaking': 'Confidently addressing groups',
                          'research': 'Gathering and analyzing information',
                          'self-motivation': 'Working well without supervision',
                          'strategic thinking': 'Planning with future goals in mind',
                          'stress management': 'Maintaining performance under pressure',
                          'work ethic': 'Dedication to quality work',
                          'analytical': 'Examining information to draw conclusions',
                          'proactive': 'Taking initiative before problems arise',
                          'detail-oriented': 'Focused on precision and accuracy',
                          'problem-solving': 'Finding effective solutions to challenges',
                        };
                        
                        // Find a matching description (case insensitive)
                        const skillLower = skill.toLowerCase();
                        const matchingKey = Object.keys(descriptions).find(key => 
                          skillLower.includes(key.toLowerCase())
                        );
                        
                        const skillDescription = matchingKey ? descriptions[matchingKey] : 'Important professional attribute';
                        
                        // Determine a strength level based on the index (for demonstration)
                        // In a real application, this could come from the CV analysis
                        const strengthLevel = Math.min(5, Math.max(3, 5 - Math.floor(index / 2)));
                        
                        return (
                          <div key={index} className="bg-white rounded-lg p-3 border border-yellow-200 shadow-sm">
                            <div className="font-medium text-yellow-800 mb-1">{skill}</div>
                            <div className="text-xs text-gray-600 mb-2">
                              {skillDescription}
                            </div>
                            <div className="flex items-center">
                              <div className="text-xs text-gray-500 mr-2">Strength:</div>
                              <div className="flex">
                                {[...Array(5)].map((_, i) => (
                                  <div 
                                    key={i} 
                                    className={`w-2 h-2 rounded-full mx-0.5 ${
                                      i < strengthLevel ? 'bg-yellow-500' : 'bg-gray-200'
                                    }`}
                                  ></div>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }
              
              // Regular display for other skill categories
              return (
                <div key={category} className={`p-4 bg-gray-50 rounded-lg ${category.toLowerCase() === 'tools' ? 'md:col-span-3' : ''}`}>
                  <h5 className="font-medium text-gray-700 mb-2">{category.charAt(0).toUpperCase() + category.slice(1)}</h5>
                  
                  {category.toLowerCase() === 'tools' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {skills.map((skill, index) => {
                        const toolInfo = getToolInfo(skill);
                        return (
                          <div key={index} className="bg-white border border-blue-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center mb-2">
                              <div className="mr-2 text-blue-500 text-lg">
                                {toolInfo.icon}
                              </div>
                              <div className="font-medium text-blue-800">
                                {skill}
                              </div>
                            </div>
                            <div className="text-xs text-gray-500 bg-blue-50 py-1 px-2 rounded-full inline-block">
                              {toolInfo.category}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {skills.map((skill, index) => {
                        let bgColorClass = 'bg-gray-100';
                        let textColorClass = 'text-gray-800';
                        
                        switch (category.toLowerCase()) {
                          case 'marketing':
                            bgColorClass = 'bg-pink-100';
                            textColorClass = 'text-pink-800';
                            break;
                          case 'programming':
                          case 'frameworks':
                            bgColorClass = 'bg-purple-100';
                            textColorClass = 'text-purple-800';
                            break;
                          case 'design':
                            bgColorClass = 'bg-green-100';
                            textColorClass = 'text-green-800';
                            break;
                        }

                        return (
                          <span key={index} className={`px-3 py-1 ${bgColorClass} ${textColorClass} rounded-full text-sm`}>
                            {skill}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Role Match Section */}
        {cvAnalysis.role && (
          <div className="analysis-section mb-6">
            <h4 className="text-lg font-semibold mb-3 text-gray-700">Role Analysis</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-indigo-50 rounded-lg">
                <h5 className="font-medium text-gray-700 mb-2">Primary Role Match</h5>
                <div className="flex justify-between items-center">
                  <p className="text-indigo-700 font-medium">{cvAnalysis.role.primaryRole}</p>
                  <span className="text-sm text-indigo-600">
                    {Math.round(cvAnalysis.role.confidence * 100)}% match
                  </span>
                </div>
              </div>
              {cvAnalysis.role.capabilities.length > 0 && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h5 className="font-medium text-gray-700 mb-2">Key Capabilities</h5>
                  <div className="flex flex-wrap gap-2">
                    {cvAnalysis.role.capabilities.map((capability, index) => (
                      <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                        {capability.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">Candidate Profile</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <FaTimes />
          </button>
        </div>

        {fetchError && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4">
            {fetchError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center space-x-4 mb-6">
              {profilePicture ? (
                <img
                  src={profilePicture}
                  alt={application.name}
                  className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                  onError={(e) => {
                    const imgElement = e.currentTarget;
                    console.error('Image failed to load:', {
                      src: imgElement.src,
                      naturalWidth: imgElement.naturalWidth,
                      naturalHeight: imgElement.naturalHeight,
                      complete: imgElement.complete,
                      currentSrc: imgElement.currentSrc
                    });
                    e.currentTarget.onerror = null;
                    setProfilePicture(null);
                  }}
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
              <div>
                <h3 className="text-xl font-semibold">{application.name}</h3>
                <p className="text-gray-600">{application.email}</p>
              </div>
            </div>

            <div className="space-y-3">
              <p><span className="font-medium">Phone:</span> {application.phone}</p>
              <p><span className="font-medium">Applied for:</span> {application.jobTitle}</p>
              <p><span className="font-medium">Applied on:</span> {formatDate(application.createdAt)}</p>
            </div>
          </div>

          <div>
            {canManageStatus ? (
              <>
                <h3 className="text-lg font-semibold mb-4">Application Status</h3>
                <div className="space-y-4">
                  {statusOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setNewStatus(option.value);
                        if (option.value === 'interviewed') {
                          setShowInterviewModal(true);
                        } else {
                          handleStatusChange();
                        }
                      }}
                      disabled={isUpdating}
                      className={`w-full py-2 px-4 rounded-lg transition-colors ${
                        status === option.value
                          ? option.color + ' font-semibold'
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2">Status</h3>
                <span className={`px-3 py-1 rounded-full ${getStatusColor(status)} border`}>
                  <span className="status-icon-large">{getStatusIcon(status)}</span> {statusOptions.find(opt => opt.value === status)?.label || status}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-4">Cover Letter</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="whitespace-pre-wrap">{application.coverLetter || 'No cover letter provided'}</p>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-4">Resume</h3>
          <div className="flex gap-3">
            <a
              href={`http://localhost:5001/api/uploads/resumes/${application.resumeUrl.split('/').pop()}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              onClick={(e) => {
                // Prevent default behavior
                e.preventDefault();
                
                // Construct the proper URL
                const fileName = application.resumeUrl.split('/').pop();
                const resumeUrl = `http://localhost:5001/api/uploads/resumes/${fileName}`;
                
                // Open in new window
                window.open(resumeUrl, '_blank', 'noopener,noreferrer');
              }}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              View Resume
            </a>
            <button 
              onClick={handleAnalyzeCV} 
              disabled={isAnalyzing}
              className={`inline-flex items-center px-4 py-2 rounded-lg transition-colors ${
                isAnalyzing 
                  ? 'bg-gray-300 text-gray-600 cursor-not-allowed' 
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analyzing...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  Analyze CV
                </>
              )}
            </button>
          </div>
          {analysisError && (
            <div className="mt-3 p-3 bg-red-50 text-red-600 rounded-lg">
              {analysisError}
            </div>
          )}
        </div>

        {cvAnalysis && renderAnalysisResults()}

        {/* Interview Scheduling Modal */}
        <Modal 
          show={showInterviewModal} 
          onHide={() => {
            setShowInterviewModal(false);
            setNewStatus('');
            setInterviewDate('');
            setInterviewTime('');
          }}
          centered
          className="status-modal"
          backdrop="static"
          keyboard={false}
        >
          <Modal.Header closeButton>
            <Modal.Title>Schedule Interview</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Interview Date</Form.Label>
                <Form.Control
                  type="date"
                  value={interviewDate}
                  onChange={(e) => setInterviewDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                  className="form-control"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Interview Time</Form.Label>
                <Form.Control
                  type="time"
                  value={interviewTime}
                  onChange={(e) => setInterviewTime(e.target.value)}
                  required
                  className="form-control"
                />
              </Form.Group>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button 
              variant="secondary" 
              onClick={() => {
                setShowInterviewModal(false);
                setNewStatus('');
                setInterviewDate('');
                setInterviewTime('');
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="primary" 
              onClick={() => {
                if (!interviewDate || !interviewTime) {
                  alert('Please provide both interview date and time');
                  return;
                }
                handleStatusChange();
                setShowInterviewModal(false);
              }}
              disabled={!interviewDate || !interviewTime}
            >
              Schedule Interview
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </div>
  );
};

// Function to determine tool icon and category
const getToolInfo = (toolName: string): { icon: React.ReactNode, category: string } => {
  const toolLower = toolName.toLowerCase();
  
  // Define tool categories with their icons (using SVG for simplicity)
  if (toolLower.includes('google') || toolLower.includes('analytics')) {
    return {
      icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>,
      category: 'Analytics & Reporting'
    };
  }
  if (toolLower.includes('adobe') || toolLower.includes('photoshop') || toolLower.includes('illustrator')) {
    return {
      icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
            </svg>,
      category: 'Design & Creative'
    };
  }
  if (toolLower.includes('excel') || toolLower.includes('word') || toolLower.includes('powerpoint') || toolLower.includes('office')) {
    return {
      icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
            </svg>,
      category: 'Productivity'
    };
  }
  if (toolLower.includes('jira') || toolLower.includes('asana') || toolLower.includes('trello') || toolLower.includes('monday')) {
    return {
      icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" />
            </svg>,
      category: 'Project Management'
    };
  }
  if (toolLower.includes('salesforce') || toolLower.includes('hubspot') || toolLower.includes('zoho') || toolLower.includes('crm')) {
    return {
      icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M8 5a1 1 0 100 2h5.586l-1.293 1.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L13.586 5H8zM12 15a1 1 0 100-2H6.414l1.293-1.293a1 1 0 10-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L6.414 15H12z" />
            </svg>,
      category: 'CRM & Sales'
    };
  }
  if (toolLower.includes('wordpress') || toolLower.includes('webflow') || toolLower.includes('wix')) {
    return {
      icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.56-.5-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.572-.837-4.118A6.004 6.004 0 0115.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.56.5.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.498-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.147.748-2.572.837-4.118h1.946a6.004 6.004 0 01-2.783 4.118zm-6.268 0C6.412 13.97 6.118 12.546 6.03 11H4.083a6.004 6.004 0 002.783 4.118z" clipRule="evenodd" />
            </svg>,
      category: 'Web Development'
    };
  }
  if (toolLower.includes('mailchimp') || toolLower.includes('constant contact') || toolLower.includes('campaign')) {
    return {
      icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
            </svg>,
      category: 'Email Marketing'
    };
  }
  if (toolLower.includes('hootsuite') || toolLower.includes('buffer') || toolLower.includes('social')) {
    return {
      icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
            </svg>,
      category: 'Social Media'
    };
  }
  if (toolLower.includes('aws') || toolLower.includes('azure') || toolLower.includes('cloud')) {
    return {
      icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M5.5 16a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 16h-8z" />
            </svg>,
      category: 'Cloud Services'
    };
  }
  
  // Default icon and category
  return {
    icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
          </svg>,
    category: 'Software & Applications'
  };
};

export default ApplicationProfile; 