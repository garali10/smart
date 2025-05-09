import { useEffect, useState, useRef } from "react";
import PageMeta from "../../components/common/PageMeta";
import { useNavigate } from 'react-router-dom';
import Button from '@/components/ui/button/Button';
import axios from 'axios';
import { Application } from '../../types/application';
import ApplicationProfile from "../../components/ApplicationProfile/ApplicationProfile";
import { FaMedal, FaTrophy, FaTrash, FaChartBar, FaChartPie, FaUserFriends } from 'react-icons/fa';


import Modal from 'react-bootstrap/Modal';
import Form from 'react-bootstrap/Form';


// Eye icon component
const EyeIcon = () => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24" 
    strokeWidth={1.5} 
    stroke="currentColor" 
    className="w-5 h-5"
  >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" 
    />
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" 
    />
  </svg>
);

// Statistics component to display department distribution
const DepartmentStatistics = ({ applications }: { applications: Application[] }) => {
  const [showStats, setShowStats] = useState(true); // Changed to true by default to always show stats
  const [animationComplete, setAnimationComplete] = useState(false);
  const [departmentCounts, setDepartmentCounts] = useState({
    engineering: 0,
    marketing: 0,
    sales: 0,
    other: 0,
  });
  const [animatedValues, setAnimatedValues] = useState({
    engineering: 0,
    marketing: 0,
    sales: 0,
    other: 0,
  });
  const requestRef = useRef<number>();
  const startTimeRef = useRef<number>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationDuration = 1500; // Animation duration in ms

  // Colors for pie chart
  const colors = {
    engineering: '#3b82f6', // blue
    marketing: '#8b5cf6',   // purple
    sales: '#10b981',       // green
    other: '#9ca3af'        // gray
  };

  useEffect(() => {
    // Calculate department counts
    if (!applications.length) return;

    const counts = {
      engineering: 0,
      marketing: 0,
      sales: 0,
      other: 0,
    };

    // Direct count from applications based on job title and other indicators
    applications.forEach(app => {
      const jobTitle = app.jobTitle?.toLowerCase() || '';
      
      // Check for engineering department
      if (jobTitle.includes('develop') || 
          jobTitle.includes('dev') ||
          jobTitle.includes('react') ||
          jobTitle.includes('engineer') || 
          jobTitle.includes('tech') ||
          jobTitle.includes('developperrrr') ||
          jobTitle.includes('zeryui')) {
        counts.engineering++;
      }
      // Check for marketing department
      else if (jobTitle.includes('market') || 
               jobTitle.includes('brand') || 
               jobTitle.includes('content') ||
               jobTitle.includes('jhgfdsdfg')) {
        counts.marketing++;
      }
      // Check for sales department
      else if (jobTitle.includes('sales') || 
               jobTitle.includes('account manager') || 
               jobTitle.includes('manager') ||
               jobTitle.includes('business')) {
        counts.sales++;
      }
      // If no department match, count as other
      else {
        counts.other++;
      }
      
      // If we have CV analysis, override the department based on that
      if (app.analysis?.profileType) {
        const profileType = app.analysis.profileType.toLowerCase();
        
        // Reset the previous count since we're overriding
        if (jobTitle.includes('develop') || jobTitle.includes('engineer') || jobTitle.includes('tech')) {
          counts.engineering--;
        } else if (jobTitle.includes('market') || jobTitle.includes('brand')) {
          counts.marketing--;
        } else if (jobTitle.includes('sales') || jobTitle.includes('account manager')) {
          counts.sales--;
        } else {
          counts.other--;
        }
        
        // Now assign based on profile type
        if (profileType.includes('develop') || profileType.includes('engineer')) {
          counts.engineering++;
        } else if (profileType.includes('market')) {
          counts.marketing++;
        } else if (profileType.includes('sales')) {
          counts.sales++;
        } else {
          counts.other++;
        }
      }
    });

    console.log('Department counts:', counts);
    setDepartmentCounts(counts);
    
    // Initialize animated values to 0
    setAnimatedValues({
      engineering: 0,
      marketing: 0,
      sales: 0,
      other: 0,
    });
    
    // Start animation
    startTimeRef.current = undefined;
    requestRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [applications, showStats]);

  const animate = (timestamp: number) => {
    if (!startTimeRef.current) {
      startTimeRef.current = timestamp;
    }
    
    const elapsed = timestamp - startTimeRef.current;
    const progress = Math.min(elapsed / animationDuration, 1);
    
    // Easing function for smooth animation
    const eased = easeOutQuart(progress);
    
    setAnimatedValues({
      engineering: Math.floor(departmentCounts.engineering * eased),
      marketing: Math.floor(departmentCounts.marketing * eased),
      sales: Math.floor(departmentCounts.sales * eased),
      other: Math.floor(departmentCounts.other * eased),
    });
    
    // Draw pie chart with current animated values
    drawPieChart(eased);
    
    if (progress < 1) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
      setAnimationComplete(true);
    }
  };
  
  // Easing function for smooth animation
  const easeOutQuart = (x: number): number => {
    return 1 - Math.pow(1 - x, 4);
  };

  // Function to draw the pie chart
  const drawPieChart = (progress: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Calculate total for percentages
    const total = Object.values(departmentCounts).reduce((sum, count) => sum + count, 0);
    if (total === 0) return;
    
    // Calculate animated slice values
    const animatedSlices = {
      engineering: departmentCounts.engineering * progress,
      marketing: departmentCounts.marketing * progress,
      sales: departmentCounts.sales * progress,
      other: departmentCounts.other * progress
    };
    
    // Draw pie chart
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;
    
    let startAngle = -0.5 * Math.PI; // Start at top (12 o'clock position)
    
    Object.entries(animatedSlices).forEach(([department, value]) => {
      if (value === 0) return;
      
      const sliceAngle = (value / total) * 2 * Math.PI;
      const endAngle = startAngle + sliceAngle;
      
      // Draw slice
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      
      ctx.fillStyle = colors[department as keyof typeof colors];
      ctx.fill();
      
      // Update start angle for next slice
      startAngle = endAngle;
    });
    
    // Draw a white circle in the middle for donut effect
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.6, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  };

  const toggleStats = () => {
    setShowStats(!showStats);
    setAnimationComplete(false);
  };
  
  // Calculate percentages for labels
  const calculatePercentage = (value: number) => {
    if (!applications.length) return 0;
    return Math.round((value / applications.length) * 100);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FaChartPie className="text-primary" />
          Department Distribution
        </h3>
        <button
          onClick={toggleStats}
          className="px-3 py-1 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          {showStats ? "Hide Stats" : "Show Stats"}
        </button>
      </div>
      
      {showStats && (
        <div className="pt-2 pb-1">
          <div className="flex flex-col md:flex-row">
            {/* Pie Chart */}
            <div className="w-full md:w-1/2 flex justify-center items-center">
              <canvas 
                ref={canvasRef} 
                width={240} 
                height={240} 
                className="max-w-full h-auto"
              />
            </div>
            
            {/* Legend and stats */}
            <div className="w-full md:w-1/2 space-y-4 flex flex-col justify-center mt-4 md:mt-0">
              {/* Engineering */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                  <span className="text-sm font-medium">Engineering</span>
                </div>
                <div className="flex items-center">
                  <span className="text-sm font-semibold mr-2">
                    {animatedValues.engineering}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({calculatePercentage(departmentCounts.engineering)}%)
                  </span>
                </div>
              </div>
              
              {/* Marketing */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-purple-500 mr-2"></div>
                  <span className="text-sm font-medium">Marketing</span>
                </div>
                <div className="flex items-center">
                  <span className="text-sm font-semibold mr-2">
                    {animatedValues.marketing}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({calculatePercentage(departmentCounts.marketing)}%)
                  </span>
                </div>
              </div>
              
              {/* Sales */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                  <span className="text-sm font-medium">Sales</span>
                </div>
                <div className="flex items-center">
                  <span className="text-sm font-semibold mr-2">
                    {animatedValues.sales}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({calculatePercentage(departmentCounts.sales)}%)
                  </span>
                </div>
              </div>
              
              {/* Other/Unclassified */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-gray-400 mr-2"></div>
                  <span className="text-sm font-medium">Unclassified</span>
                </div>
                <div className="flex items-center">
                  <span className="text-sm font-semibold mr-2">
                    {animatedValues.other}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({calculatePercentage(departmentCounts.other)}%)
                  </span>
                </div>
              </div>
              
              {animationComplete && (
                <div className="text-xs text-center text-gray-500 pt-1 mt-2">
                  {applications.length} total applications
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Search icon component
const SearchIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="w-5 h-5 text-gray-400"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
    />
  </svg>
);

// Job icon component
const JobIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="w-8 h-8"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z"
    />
  </svg>
);

// Add TrophyIcon component
const TrophyIcon = () => (
  <FaTrophy className="w-8 h-8" />
);

// Helper function for status colors - moved outside of Home component
const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'shortlisted':
      return 'bg-blue-100 text-blue-800';
    case 'interviewed':
      return 'bg-purple-100 text-purple-800';
    case 'joined':
      return 'bg-green-100 text-green-800';
    case 'rejected':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

// Add StatusPopup component at the top level
const StatusPopup = ({ 
  status, 
  applications, 
  onClose,
  onViewApplication 
}: { 
  status: string, 
  applications: Application[], 
  onClose: () => void,
  onViewApplication: (application: Application) => void 
}) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold capitalize">{status} Applications</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Candidate
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Position
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Applied Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {applications.map((application) => (
              <tr key={application._id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {application.analysis?.score?.total && (
                      <div className="mr-3 flex items-center" title="Candidate Score">
                        <FaMedal 
                          className={
                            application.analysis.score.total >= 80
                              ? "text-green-500"
                              : application.analysis.score.total >= 60
                              ? "text-yellow-500"
                              : "text-red-500"
                          } 
                          size={18}
                        />
                        <span className="ml-1 text-sm font-semibold">
                          {application.analysis.score.total}
                        </span>
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {application.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {application.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {application.jobTitle || 'Unknown Position'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(application.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="d-flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedApplication(application);
                        setShowStatusModal(true);
                      }}
                      className="btn btn-sm btn-primary"
                    >
                      Change Status
                    </button>
                    <button
                      onClick={() => handleViewApplication(application)}
                      className="text-primary hover:text-primary/80 p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
                      title="View Application"
                    >
                      <EyeIcon />
                    </button>
                    <button
                      onClick={() => handleDeleteCandidate(application)}
                      className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
                      title="Delete Candidate"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

// Add RankingPopup component
const RankingPopup = ({ 
  applications, 
  onClose,
  onViewApplication,
  onDeleteCandidate,
  loading
}: { 
  applications: any[], 
  onClose: () => void,
  onViewApplication: (application: any) => void,
  onDeleteCandidate: (application: any) => void,
  loading: boolean
}) => {
  // Check if there are any applications to display
  const hasApplications = applications && applications.length > 0;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">Candidates Ranking</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading rankings...</p>
          </div>
        ) : !hasApplications ? (
          <div className="text-center py-8">
            <div className="text-gray-500 mb-4">No candidates with ranking data available.</div>
            <p className="text-sm text-gray-400">
              Candidates need to have their CV analyzed to appear in the rankings.
            </p>
          </div>
        ) : (
          <>
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    Candidates are ranked based on an analysis of their CV, experience, skills, and education.
                    <span className="font-medium"> Scores range from 0-100.</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Candidate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Position
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Key Strengths
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {applications.map((application, index) => (
                    <tr key={index} className={index < 3 ? "bg-yellow-50" : ""}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {index === 0 && <FaTrophy className="text-yellow-500 mr-2" />}
                          {index === 1 && <FaTrophy className="text-gray-400 mr-2" />}
                          {index === 2 && <FaTrophy className="text-amber-700 mr-2" />}
                          <span className="font-bold">{application.rank || index + 1}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {application.candidate || application.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {application.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <FaMedal 
                            className={
                              (application.score || 0) >= 80
                                ? "text-green-500 mr-2"
                                : (application.score || 0) >= 60
                                ? "text-yellow-500 mr-2"
                                : "text-red-500 mr-2"
                            } 
                          />
                          <span className="font-bold">
                            {application.score || application.analysis?.score?.total || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {application.position || application.jobTitle || 'Unknown Position'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {application.keyStrengths ? (
                            <div className="flex flex-wrap gap-1">
                              {application.keyStrengths.slice(0, 3).map((skill: string, i: number) => (
                                <span key={i} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          ) : application.analysis?.keySkills ? (
                            <div className="flex flex-wrap gap-1">
                              {application.analysis.keySkills.slice(0, 3).map((skill: string, i: number) => (
                                <span key={i} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400">No skills data</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(application.status)}`}>
                          {application.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewApplication(application);
                            }}
                            className="text-primary hover:text-primary/80 p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
                            title="View Application"
                          >
                            <EyeIcon />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCandidate(application);
                            }}
                            className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
                            title="Delete Candidate"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Add a new FilterIcon component to use as the department filter button
const FilterIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="w-6 h-6"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z"
    />
  </svg>
);

// Update the DepartmentMatchPopup component to include delete functionality
const DepartmentMatchPopup = ({ 
  department, 
  applications, 
  onClose,
  onViewApplication,
  rankings,
  onDeleteCandidate,
  onRemoveFromDepartment
}: { 
  department: string, 
  applications: Application[], 
  onClose: () => void,
  onViewApplication: (application: Application) => void,
  rankings: any[],
  onDeleteCandidate: (application: Application) => void,
  onRemoveFromDepartment: (application: Application, department: string) => void
}) => {
  // Function to extract and enhance key skills display
  const renderKeySkills = (application: Application) => {
    // Try to get skills from multiple possible sources
    const keySkills = application.analysis?.keySkills || [];
    
    if (keySkills && keySkills.length > 0) {
      return (
        <div className="flex flex-wrap gap-1">
          {keySkills.slice(0, 3).map((skill: string, i: number) => (
            <span key={i} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
              {skill}
            </span>
          ))}
          {keySkills.length > 3 && (
            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
              +{keySkills.length - 3} more
            </span>
          )}
        </div>
      );
    }
    
    // Check if we have ranking data for this application
    const appInRankings = rankings.find(
      (rank: any) => rank._id === application._id || rank.applicationId === application._id
    );
    
    if (appInRankings && appInRankings.keyStrengths && appInRankings.keyStrengths.length > 0) {
      return (
        <div className="flex flex-wrap gap-1">
          {appInRankings.keyStrengths.slice(0, 3).map((skill: string, i: number) => (
            <span key={i} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
              {skill}
            </span>
          ))}
        </div>
      );
    }
    
    return <span className="text-gray-400">No skills data</span>;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">{department} Department Matches</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                Showing candidates whose profile type and skills match the <span className="font-medium">{department}</span> department requirements based on CV analysis.
              </p>
            </div>
          </div>
        </div>

        {applications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No candidates found matching the {department} department
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Candidate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Position Applied
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Match Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Key Skills
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {applications.map((application) => {
                  const score = application.analysis?.score?.total || 0;
                  
                  return (
                    <tr key={application._id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {application.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {application.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {application.jobTitle || 'Unknown Position'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <FaMedal 
                            className={
                              score >= 80
                                ? "text-green-500 mr-2"
                                : score >= 60
                                ? "text-yellow-500 mr-2"
                                : "text-red-500 mr-2"
                            } 
                            size={18}
                          />
                          <span className="font-semibold">{score}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {renderKeySkills(application)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(application.status)}`}>
                          {application.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewApplication(application);
                            }}
                            className="text-primary hover:text-primary/80 p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
                            title="View Application"
                          >
                            <EyeIcon />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCandidate(application);
                            }}
                            className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
                            title="Delete Candidate"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// Add a FeaturedCandidates component for displaying candidate profiles with images

const FeaturedCandidates = ({ 
  applications,
  showTopCandidates,
  setShowTopCandidates,
  onViewApplication,
  handleDeleteCandidate
}: { 
  applications: Application[],
  showTopCandidates: boolean,
  setShowTopCandidates: (show: boolean) => void,
  onViewApplication: (candidate: Application) => void,
  handleDeleteCandidate: (candidate: Application) => void
}) => {

  // Get the top 8 candidates with the highest scores
  const topCandidates = [...applications]
    .filter(app => app.analysis?.score?.total)
    .sort((a, b) => (b.analysis?.score?.total || 0) - (a.analysis?.score?.total || 0))
    .slice(0, 8);


  // Helper function to determine job department from job title
  const getJobDepartment = (jobTitle: string): string => {
    const lowerJobTitle = jobTitle?.toLowerCase() || '';
    
    if (lowerJobTitle.includes('marketing') || 
        lowerJobTitle.includes('brand') || 
        lowerJobTitle.includes('social media') ||
        lowerJobTitle.includes('jhgfdsdfg')) {
      return 'Marketing';
    } else if (lowerJobTitle.includes('engineer') || 
               lowerJobTitle.includes('developer') || 
               lowerJobTitle.includes('dev') ||
               lowerJobTitle.includes('react') ||
               lowerJobTitle.includes('programming') || 
               lowerJobTitle.includes('tech') ||
               lowerJobTitle.includes('developperrrr') ||
               lowerJobTitle.includes('zeryui')) {
      return 'Engineering';
    } else if (lowerJobTitle.includes('sales') || 
               lowerJobTitle.includes('account') || 
               lowerJobTitle.includes('business') ||
               lowerJobTitle.includes('manager')) {
      return 'Sales';
    }
    
    return 'Unknown Department';
  };

  if (topCandidates.length === 0 || !showTopCandidates) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FaUserFriends className="text-primary" />
          Top Candidates
        </h3>

        <button
          onClick={() => setShowTopCandidates(false)}
          className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Hide Section
        </button>


      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Department
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Score
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Photos
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {topCandidates.map((candidate, index) => (
              <tr key={candidate._id} className="hover:bg-gray-50 cursor-pointer" onClick={() => onViewApplication(candidate)}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-10 w-10 flex-shrink-0">
                      <div className="h-10 w-10 rounded-full overflow-hidden bg-gray-100">
                        {candidate.profilePicture ? (
                          <img 
                            src={`http://localhost:5001/uploads/profile-pictures/${candidate.profilePicture}`}
                            alt={candidate.name}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/40';
                            }}
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-primary text-white">
                            {candidate.name?.charAt(0).toUpperCase() || '?'}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900 flex items-center">
                        {candidate.name} {' '}
                      </div>
                      <div className="text-xs text-gray-500">
                        {candidate.jobTitle || 'Unknown Position'}
                        {candidate.analysis?.score?.total && (
                          <FaMedal 
                            className={
                              candidate.analysis.score.total >= 80
                                ? "text-green-500 ml-2"
                                : candidate.analysis.score.total >= 60
                                ? "text-yellow-500 ml-2"
                                : "text-red-500 ml-2"
                            } 
                            size={14}
                          />
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {getJobDepartment(candidate.jobTitle)}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {candidate.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {getJobDepartment(candidate.jobTitle)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {candidate.analysis?.score?.total && (
                      <FaMedal 
                        className={
                          candidate.analysis.score.total >= 80
                            ? "text-green-500 mr-2"
                            : candidate.analysis.score.total >= 60
                            ? "text-yellow-500 mr-2"
                            : "text-red-500 mr-2"
                        } 
                        size={18}
                      />
                    )}
                    <span className="font-semibold">
                      {candidate.analysis?.score?.total || 'N/A'}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {Math.floor(Math.random() * 1000) + 1}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewApplication(candidate);
                      }}
                      className="text-primary hover:text-primary/80 p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
                      title="View Application"
                    >
                      <EyeIcon />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCandidate(candidate);
                      }}
                      className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
                      title="Delete Candidate"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default function Home() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const applicationsPerPage = 7;
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [showRanking, setShowRanking] = useState(false);
  const [rankedApplications, setRankedApplications] = useState<any[]>([]);
  const [rankingsLoading, setRankingsLoading] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);

  const [showTopCandidates, setShowTopCandidates] = useState(false);

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewTime, setInterviewTime] = useState('');
  const [showApplicationProfile, setShowApplicationProfile] = useState(false);


  // Helper function to determine job department from job title
  const getJobDepartment = (jobTitle: string): string => {
    const lowerJobTitle = jobTitle?.toLowerCase() || '';
    
    if (lowerJobTitle.includes('marketing') || 
        lowerJobTitle.includes('brand') || 
        lowerJobTitle.includes('social media') ||
        lowerJobTitle.includes('jhgfdsdfg')) {
      return 'Marketing';
    } else if (lowerJobTitle.includes('engineer') || 
               lowerJobTitle.includes('developer') || 
               lowerJobTitle.includes('dev') ||
               lowerJobTitle.includes('react') ||
               lowerJobTitle.includes('programming') || 
               lowerJobTitle.includes('tech') ||
               lowerJobTitle.includes('developperrrr') ||
               lowerJobTitle.includes('zeryui')) {
      return 'Engineering';
    } else if (lowerJobTitle.includes('sales') || 
               lowerJobTitle.includes('account') || 
               lowerJobTitle.includes('business') ||
               lowerJobTitle.includes('manager')) {
      return 'Sales';
    }
    
    // If we can't determine the department from the job title,
    // try to infer it from the department field if available
    return 'Unknown Department';
  };

  // Helper function to map profile types to departments
  const profileTypeToDepartment = (profileType: string): string => {
    const type = profileType.toLowerCase();
    
    if (type === 'developer' || 
        type === 'engineer' || 
        type === 'software engineer' || 
        type === 'programmer' ||
        type === 'web developer' ||
        type === 'system administrator') {
      return 'Engineering';
    } else if (type === 'marketing' || 
               type === 'digital marketer' || 
               type === 'content creator' || 
               type === 'seo specialist' ||
               type === 'social media manager') {
      return 'Marketing';
    } else if (type === 'sales' || 
               type === 'account manager' || 
               type === 'business development' ||
               type === 'sales representative') {
      return 'Sales';
    }
    
    return 'Unknown';
  };

  // Improve the extractDepartmentFromCV function to include cover letter analysis
  const extractDepartmentFromCV = (application: Application): string | null => {
    // Check cover letter content first - this is key for marketing CVs
    const coverLetterContent = application.coverLetter?.toLowerCase() || '';
    if (coverLetterContent.includes('marketing') || 
        coverLetterContent.includes('brand') || 
        coverLetterContent.includes('content') ||
        coverLetterContent.includes('social media') ||
        coverLetterContent.includes('digital marketing') ||
        coverLetterContent.includes('campaign') ||
        coverLetterContent.includes('advertising')) {
      console.log(`Detected Marketing department from cover letter for ${application.name}`);
      return 'Marketing';
    }
    
    // Next check job titles in the CV that indicate department
    const jobTitle = application.jobTitle?.toLowerCase() || '';
    const name = application.name?.toLowerCase() || '';
    
    // Add persistently applied job matching - key for jhgfdsdfg position ID
    if (jobTitle === 'jhgfdsdfg' || jobTitle.includes('jhgfdsdfg')) {
      console.log(`Detected Marketing department from job code jhgfdsdfg for ${application.name}`);
      return 'Marketing';
    }
    
    // Check if we have explicit department or job information in the application
    if (jobTitle.includes('marketing') || 
        jobTitle.includes('brand') || 
        jobTitle.includes('content') ||
        name.includes('marketing')) {
      return 'Marketing';
    }
    
    if (jobTitle.includes('engineer') || 
        jobTitle.includes('developer') || 
        jobTitle.includes('programming') ||
        jobTitle.includes('software') ||
        name.includes('engineer') ||
        name.includes('developer') ||
        jobTitle.includes('developper') ||
        jobTitle.includes('zeryui')) {
      return 'Engineering';
    }
    
    if (jobTitle.includes('sales') || 
        jobTitle.includes('account manager') || 
        jobTitle.includes('business development') ||
        name.includes('sales')) {
      return 'Sales';
    }
    
    // Check for skills in analysis that strongly indicate a department
    if (application.analysis?.keySkills) {
      const skills = application.analysis.keySkills.map((s: string) => s.toLowerCase());
      
      // Count skills by department
      let engineeringSkillsCount = 0;
      let marketingSkillsCount = 0;
      let salesSkillsCount = 0;
      
      // Engineering skills
      const engineeringKeywords = [
        'programming', 'developer', 'software', 'coding', 'java', 
        'python', 'javascript', 'html', 'css', 'react', 'angular',
        'node', 'database', 'sql', 'nosql', 'git', 'engineering',
        'computer science', 'development'
      ];
      
      // Marketing skills
      const marketingKeywords = [
        'marketing', 'social media', 'seo', 'content', 'branding',
        'advertising', 'campaign', 'digital marketing', 'market research',
        'brand management', 'copywriting', 'analytics', 'strategy'
      ];
      
      // Sales skills
      const salesKeywords = [
        'sales', 'negotiation', 'customer', 'business development',
        'account management', 'client', 'crm', 'lead generation',
        'closing', 'pipeline', 'revenue', 'sales management', 'forecasting'
      ];
      
      // Count skills by department
      skills.forEach(skill => {
        if (engineeringKeywords.some(keyword => skill.includes(keyword))) {
          engineeringSkillsCount++;
        }
        if (marketingKeywords.some(keyword => skill.includes(keyword))) {
          marketingSkillsCount++;
        }
        if (salesKeywords.some(keyword => skill.includes(keyword))) {
          salesSkillsCount++;
        }
      });
      
      // Return the department with the most matching skills
      if (engineeringSkillsCount > marketingSkillsCount && engineeringSkillsCount > salesSkillsCount) {
        return 'Engineering';
      }
      if (marketingSkillsCount > engineeringSkillsCount && marketingSkillsCount > salesSkillsCount) {
        return 'Marketing';
      }
      if (salesSkillsCount > engineeringSkillsCount && salesSkillsCount > marketingSkillsCount) {
        return 'Sales';
      }
    }
    
    // Last resort - check for job code patterns
    // jhgfdsdfg code is for marketing positions
    if (jobTitle === 'jhgfdsdfg' || jobTitle.includes('jhgfdsdfg')) {
      console.log(`Mapped position code jhgfdsdfg to Marketing department for ${application.name}`);
      return 'Marketing';
    }
    
    // If we can't determine the department, return null
    return null;
  };

  // Function to extract profile type from job title when analysis fails
  const extractProfileTypeFromJobTitle = (jobTitle: string): string | null => {
    const title = jobTitle?.toLowerCase() || '';
    
    if (title.includes('engineer') || 
        title.includes('developer') || 
        title.includes('dev') ||
        title.includes('react') ||
        title.includes('programming') ||
        title.includes('software') ||
        title.includes('tech') ||
        title.includes('developperrrr') ||
        title.includes('zeryui')) {
      return 'developer';
    } else if (title.includes('marketing') || 
              title.includes('brand') || 
              title.includes('content') ||
              title.includes('social media') ||
              title.includes('jhgfdsdfg')) {
      return 'marketing';
    } else if (title.includes('sales') || 
              title.includes('account') || 
              title.includes('manager') ||
              title.includes('business')) {
      return 'sales';
    }
    
    return null;
  };
  
  // Update the updateDepartmentMatches function to use resume analysis
  const updateDepartmentMatches = (application: Application) => {
    // First check if we've analyzed this resume for department info
    const cvDepartment = extractDepartmentFromCV(application);
    
    // If we have a department from CV analysis, use that
    if (cvDepartment) {
      console.log(`Detected department ${cvDepartment} for ${application.name} from CV content`);
      
      // Get all department matches
      const departmentKeys = ['engineering', 'marketing', 'sales'];
      
      // Clear this application from all departments first
      departmentKeys.forEach(deptKey => {
        const existingMatchesJson = localStorage.getItem(`${deptKey}_matches`);
        if (existingMatchesJson) {
          let existingMatches = JSON.parse(existingMatchesJson);
          // Remove this application ID if it exists in this department
          existingMatches = existingMatches.filter((id: string) => id !== application._id);
          localStorage.setItem(`${deptKey}_matches`, JSON.stringify(existingMatches));
        }
      });
      
      // Then add only to the correct department
      const targetDept = cvDepartment.toLowerCase();
      const existingMatchesJson = localStorage.getItem(`${targetDept}_matches`);
      let existingMatches = existingMatchesJson ? JSON.parse(existingMatchesJson) : [];
      
      // Add this application's ID if not already included
      if (!existingMatches.includes(application._id)) {
        existingMatches.push(application._id);
        localStorage.setItem(`${targetDept}_matches`, JSON.stringify(existingMatches));
        console.log(`Added application ${application._id} to ${cvDepartment} matches based on CV content. Total: ${existingMatches.length}`);
      }
      
      return;
    }
    
    // If no clear department from CV, fall back to profile type and job title
    const profileType = application.analysis?.profileType || extractProfileTypeFromJobTitle(application.jobTitle);
    console.log(`Updating department matches for ${application.name} with profile type: ${profileType || 'unknown'}`);
    
    // Get the department based on profile type or job title
    const department = profileType ? profileTypeToDepartment(profileType) : getJobDepartment(application.jobTitle);
    console.log(`Matched to department: ${department}`);
    
    // Add to department matches if we have a department match
    if (department !== 'Unknown' && department !== 'Unknown Department') {
      // Get all department matches
      const departmentKeys = ['engineering', 'marketing', 'sales'];
      
      // For each department, check if this application should be included
      departmentKeys.forEach(deptKey => {
        // Get existing matches for this department
        const existingMatchesJson = localStorage.getItem(`${deptKey}_matches`);
        let existingMatches = existingMatchesJson ? JSON.parse(existingMatchesJson) : [];
        
        // If this is the matched department, add the application ID
        if (deptKey === department.toLowerCase()) {
          // Add this application's ID if not already included
          if (!existingMatches.includes(application._id)) {
            existingMatches.push(application._id);
            localStorage.setItem(`${deptKey}_matches`, JSON.stringify(existingMatches));
            console.log(`Added application ${application._id} to ${department} matches. Total: ${existingMatches.length}`);
          }
        } else {
          // Remove from other departments
          existingMatches = existingMatches.filter((id: string) => id !== application._id);
          localStorage.setItem(`${deptKey}_matches`, JSON.stringify(existingMatches));
        }
      });
    }
  };
  
  // Improve the caching system by adding a synchronization function
  const syncDepartmentMatches = () => {
    console.log('Synchronizing department matches with localStorage...');
    
    // Get department match counts for logging
    const departmentCounts = {
      engineering: 0,
      marketing: 0,
      sales: 0
    };
    
    // Get all applications
    for (const app of applications) {
      // Determine the department for each application
      const cvDepartment = extractDepartmentFromCV(app);
      if (cvDepartment) {
        const deptKey = cvDepartment.toLowerCase();
        if (deptKey in departmentCounts) {
          departmentCounts[deptKey as keyof typeof departmentCounts]++;
        }
        
        // Add to the correct department
        const matchesKey = `${deptKey}_matches`;
        const existingMatchesJson = localStorage.getItem(matchesKey);
        let existingMatches = existingMatchesJson ? JSON.parse(existingMatchesJson) : [];
        
        // Add if not already present
        if (!existingMatches.includes(app._id)) {
          existingMatches.push(app._id);
          localStorage.setItem(matchesKey, JSON.stringify(existingMatches));
        }
      }
    }
    
    console.log('Department match counts after sync:', departmentCounts);
    
    // Set timestamp
    localStorage.setItem('department_cache_timestamp', Date.now().toString());
  };

  // Update the rebuildDepartmentMatches function to be more thorough
  const rebuildDepartmentMatches = () => {
    console.log('Completely rebuilding all department matches...');
    
    // Clear all department caches
    localStorage.removeItem('engineering_matches');
    localStorage.removeItem('marketing_matches');
    localStorage.removeItem('sales_matches');
    
    // Check if any applications have marketing indicators in job code
    const marketingPositionApplications = applications.filter(app => 
      app.jobTitle === 'jhgfdsdfg' || app.jobTitle.includes('jhgfdsdfg')
    );
    
    if (marketingPositionApplications.length > 0) {
      console.log(`Found ${marketingPositionApplications.length} applications with Marketing position code jhgfdsdfg`);
      
      // Create a new marketing matches array with all these applications
      const marketingMatches = marketingPositionApplications.map(app => app._id);
      localStorage.setItem('marketing_matches', JSON.stringify(marketingMatches));
    }
    
    // Process each application to determine its department
    applications.forEach(app => {
      updateDepartmentMatches(app);
    });
    
    // Run a final sync to ensure all matches are saved
    syncDepartmentMatches();
    
    console.log('Department matches rebuild complete');
  };

  // Add back the useEffect hook that was accidentally removed
  useEffect(() => {
    const token = checkTokenValidity();
    if (token) {
      // Load applications and user role first
      Promise.all([fetchUserRole(), fetchApplications()]).then(() => {
        // After applications are loaded, force update department assignments
        setTimeout(() => {
          console.log('Initial load complete, setting up persistent department matches...');
          // First store all CV profile types for persistence
          storeCVProfileTypesInLocalStorage();
          // Then scan for missing profiles and force update
          forceScanForMissingProfiles();
          forceUpdateDepartmentAssignments();
          // Also run the new function to save analyzed applications
          saveAnalyzedApplicationsToDepartments();
        }, 1000); 
      });
    }
  }, []); // Empty dependency array ensures this runs only once at component mount

  // Add a special effect to handle component initialization
  useEffect(() => {
    // This effect runs when applications are loaded
    if (applications.length > 0 && !loading) {
      console.log('Applications loaded or changed, ensuring profile types are stored...');
      
      // Get stored profile types
      const storedProfilesJson = localStorage.getItem('cv_profile_types');
      const profileCacheAge = localStorage.getItem('profile_types_stored_at');
      const now = Date.now();
      const cacheAge = profileCacheAge ? now - parseInt(profileCacheAge) : Infinity;
      
      // Check if we need to refresh the profile cache
      if (!storedProfilesJson || cacheAge > 60 * 60 * 1000) { // 1 hour
        console.log('Profile cache missing or stale, rebuilding...');
        storeCVProfileTypesInLocalStorage();
        forceScanForMissingProfiles();
      } else {
        console.log('Profile cache is current, verifying department assignments...');
        // Verify department assignments match profile types
        forceScanForMissingProfiles();
      }
      
      // NEW: Save analyzed applications to their departments for persistence
      saveAnalyzedApplicationsToDepartments();
    }
  }, [applications.length, loading]);

  // NEW: Function to save analyzed applications to departments
  const saveAnalyzedApplicationsToDepartments = () => {
    console.log('PERSISTENT SAVE: Saving all analyzed applications to their respective departments...');
    
    // Track applications by department
    const salesMatches: string[] = [];
    const marketingMatches: string[] = [];
    const engineeringMatches: string[] = [];
    
    // Process each application with analysis data
    applications.forEach(app => {
      // Skip applications without analysis
      if (!app.analysis) {
        console.log(`Skipping ${app.name} - no analysis data`);
        return;
      }
      
      if (app.analysis.profileType) {
        const profileType = app.analysis.profileType.toLowerCase();
        
        if (profileType === 'sales' || profileType.includes('sales')) {
          salesMatches.push(app._id);
          console.log(`Added ${app.name} to Sales matches (profileType: ${profileType})`);
        }
        else if (profileType === 'marketing' || profileType.includes('market')) {
          marketingMatches.push(app._id);
          console.log(`Added ${app.name} to Marketing matches (profileType: ${profileType})`);
        }
        else if (profileType === 'developer' || profileType === 'engineer' ||
                profileType.includes('develop') || profileType.includes('engine')) {
          engineeringMatches.push(app._id);
          console.log(`Added ${app.name} to Engineering matches (profileType: ${profileType})`);
        }
      }
      // If no profileType, try using role information
      else if (app.analysis.role?.primaryRole) {
        const role = app.analysis.role.primaryRole.toLowerCase();
        
        if (role.includes('sales') || role.includes('business')) {
          salesMatches.push(app._id);
          console.log(`Added ${app.name} to Sales matches (role: ${role})`);
        }
        else if (role.includes('market') || role.includes('brand') || role.includes('content')) {
          marketingMatches.push(app._id);
          console.log(`Added ${app.name} to Marketing matches (role: ${role})`);
        }
        else if (role.includes('develop') || role.includes('engineer') || role.includes('tech')) {
          engineeringMatches.push(app._id);
          console.log(`Added ${app.name} to Engineering matches (role: ${role})`);
        }
      }
      // Try to check in the CV content or job title as last resort
      else if (app.jobTitle) {
        const jobTitle = app.jobTitle.toLowerCase();
        
        if (jobTitle.includes('sales') || jobTitle.includes('business')) {
          salesMatches.push(app._id);
          console.log(`Added ${app.name} to Sales matches (job title: ${jobTitle})`);
        }
        else if (jobTitle.includes('market') || jobTitle.includes('brand') || jobTitle.includes('content')) {
          marketingMatches.push(app._id);
          console.log(`Added ${app.name} to Marketing matches (job title: ${jobTitle})`);
        }
        else if (jobTitle.includes('develop') || jobTitle.includes('engineer') || jobTitle.includes('tech')) {
          engineeringMatches.push(app._id);
          console.log(`Added ${app.name} to Engineering matches (job title: ${jobTitle})`);
        }
      }
    });
    
    // Merge with existing matches to prevent data loss
    const mergeWithExisting = (department: string, newMatches: string[]) => {
      // Get existing matches
      const existingJson = localStorage.getItem(`${department.toLowerCase()}_matches`);
      const existingMatches = existingJson ? JSON.parse(existingJson) : [];
      
      // Create a Set for uniqueness
      const uniqueMatches = new Set([...existingMatches, ...newMatches]);
      
      // Convert back to array and save
      const mergedMatches = Array.from(uniqueMatches);
      localStorage.setItem(`${department.toLowerCase()}_matches`, JSON.stringify(mergedMatches));
      localStorage.setItem(`permanent_${department.toLowerCase()}_matches`, JSON.stringify(mergedMatches));
      console.log(`SAVED ${mergedMatches.length} matches for ${department} to localStorage and permanent storage`);
      
      return mergedMatches.length;
    };
    
    // Save to localStorage with merge
    const salesCount = mergeWithExisting('sales', salesMatches);
    const marketingCount = mergeWithExisting('marketing', marketingMatches);
    const engineeringCount = mergeWithExisting('engineering', engineeringMatches);
    
    // Log the results
    console.log(`PERSISTENT SAVE COMPLETE: Sales (${salesCount}), Marketing (${marketingCount}), Engineering (${engineeringCount})`);
    
    // Save timestamp to track when this was done
    localStorage.setItem('department_matches_saved_at', Date.now().toString());
  };

  // Update the handleDepartmentMatch function to ensure persistence
  const handleDepartmentMatch = (department: string) => {
    console.log(`Department button clicked: ${department}`);
    
    // FIRST: Force recover all CV analysis data to ensure nothing is missed
    forceRecoverAnalysisData();
    
    // Then save any newly analyzed applications
    saveAnalyzedApplicationsToDepartments();
    
    // Use the profileType-based matching with improved storage
    const matchedApplications = getApplicationsByDepartment(department);
    
    // Cache the results in all storage locations to ensure persistence
    const matchedIds = matchedApplications.map(app => app._id);
    
    // Save to all storage locations
    const matchedIdsJson = JSON.stringify(matchedIds);
    localStorage.setItem(`${department.toLowerCase()}_matches`, matchedIdsJson);
    localStorage.setItem(`permanent_${department.toLowerCase()}_matches`, matchedIdsJson);
    sessionStorage.setItem(`${department.toLowerCase()}_matches`, matchedIdsJson);
    
    console.log(`Saved ${matchedIds.length} department matches for ${department} to ALL storage locations`);
    
    // Store timestamps for cache validation
    const timestamp = Date.now().toString();
    localStorage.setItem('profile_match_timestamp', timestamp);
    sessionStorage.setItem('profile_match_timestamp', timestamp);
    
    // Set the selected department to show the popup
    setSelectedDepartment(department);
  };

  // Add an effect to force-run the scan whenever a new application appears
  useEffect(() => {
    // Run this effect whenever the application list changes
    if (applications.length > 0) {
      // Get the number of stored applications
      const storedCountJson = localStorage.getItem('stored_applications_count');
      const storedCount = storedCountJson ? JSON.parse(storedCountJson) : 0;
      
      // If we have more applications now than before, update departments
      if (applications.length !== storedCount) {
        console.log(`Application count changed from ${storedCount} to ${applications.length}, updating departments...`);
        storeCVProfileTypesInLocalStorage();
        forceScanForMissingProfiles();
        localStorage.setItem('stored_applications_count', JSON.stringify(applications.length));
      }
    }
  }, [applications.length]);

  // Check token validity
  const checkTokenValidity = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return false;
    }
    return token;
  };

  const fetchUserRole = async () => {
    const token = checkTokenValidity();
    if (!token) return;

    try {
      const response = await axios.get('http://localhost:5001/api/users/me', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data && response.data.role) {
        setUserRole(response.data.role);
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      } else {
        console.error('Error fetching user role:', error);
        setError('Failed to fetch user role. Please try again.');
      }
    }
  };

  // Add function to permanently store CV profile types in localStorage
  const storeCVProfileTypesInLocalStorage = () => {
    console.log('Permanently storing CV profile types in localStorage...');
    
    // Create a mapping of application IDs to their CV profile types
    const profileMap: Record<string, string> = {};
    
    applications.forEach(app => {
      if (app.analysis?.profileType) {
        profileMap[app._id] = app.analysis.profileType;
        console.log(`Storing profile type for ${app.name}: ${app.analysis.profileType}`);
      }
    });
    
    // Store this mapping in localStorage for persistence across page refreshes
    localStorage.setItem('cv_profile_types', JSON.stringify(profileMap));
    console.log('CV profile types stored in localStorage');
    
    // Now specifically check and update department assignments based on stored profiles
    const salesProfiles = [];
    const marketingProfiles = [];
    const engineeringProfiles = [];
    
    // Sort applications into departments based on their stored profile types
    for (const [appId, profileType] of Object.entries(profileMap)) {
      const lowerProfile = profileType.toLowerCase();
      
      if (lowerProfile === 'sales' || lowerProfile.includes('sales')) {
        salesProfiles.push(appId);
      } else if (lowerProfile === 'marketing' || lowerProfile.includes('market')) {
        marketingProfiles.push(appId);
      } else if (lowerProfile === 'developer' || lowerProfile === 'engineer' || 
                 lowerProfile.includes('develop') || lowerProfile.includes('engineer')) {
        engineeringProfiles.push(appId);
      }
    }
    
    // Update sales department matches
    if (salesProfiles.length > 0) {
      localStorage.setItem('sales_matches', JSON.stringify(salesProfiles));
      console.log(`Stored ${salesProfiles.length} sales profiles in permanent storage`);
    }
    
    // Update marketing department matches
    if (marketingProfiles.length > 0) {
      localStorage.setItem('marketing_matches', JSON.stringify(marketingProfiles));
      console.log(`Stored ${marketingProfiles.length} marketing profiles in permanent storage`);
    }
    
    // Update engineering department matches
    if (engineeringProfiles.length > 0) {
      localStorage.setItem('engineering_matches', JSON.stringify(engineeringProfiles));
      console.log(`Stored ${engineeringProfiles.length} engineering profiles in permanent storage`);
    }
    
    // Set timestamp of when this data was last updated
    localStorage.setItem('profile_types_stored_at', Date.now().toString());
  };

  // Update fetchApplications to ensure profile types are stored
  const fetchApplications = async () => {
    const token = checkTokenValidity();
    if (!token) return;

    try {
      const response = await axios.get('http://localhost:5001/api/applications', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data) {
        setApplications(response.data);
        setError(null);
        
        // After setting applications, store CV profile types and force rebuild
        setTimeout(() => {
          console.log('Applications loaded, storing profile types and rebuilding department matches...');
          storeCVProfileTypesInLocalStorage();
          forceScanForMissingProfiles();
          forceUpdateDepartmentAssignments();
        }, 500);
        
      } else {
        setError('No data received from server');
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      } else {
        console.error('Error fetching applications:', err);
        setError(
          err.response?.data?.message || 
          err.message || 
          'Failed to load applications'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Update the findDepartmentMatches function to prioritize detected profile type
  const findDepartmentMatches = (department: string): Application[] => {
    console.log(`Computing matches for ${department} department`);
    
    // Standardize department name for comparison
    const normalizedDepartment = department.toLowerCase();
    
    // Get all applications
    return applications.filter(app => {
      // FIRST PRIORITY: Check if the application has a profileType that directly matches department
      if (app.analysis?.profileType) {
        const profileType = app.analysis.profileType;
        console.log(`${app.name} has profile type: ${profileType}`);
        
        // Direct match for Sales profile
        if (profileType === 'Sales' && normalizedDepartment === 'sales') {
          console.log(`${app.name} matched to Sales department by profile type`);
          return true;
        }
        
        // Direct match for Marketing profile
        if (profileType === 'Marketing' && normalizedDepartment === 'marketing') {
          console.log(`${app.name} matched to Marketing department by profile type`);
          return true;
        }
        
        // Direct match for Developer/Engineering profile
        if ((profileType === 'Developer' || profileType === 'Engineer') && normalizedDepartment === 'engineering') {
          console.log(`${app.name} matched to Engineering department by profile type`);
          return true;
        }
        
        // Check for partial matches (case insensitive)
        const lowerProfileType = profileType.toLowerCase();
        if (lowerProfileType.includes(normalizedDepartment) || normalizedDepartment.includes(lowerProfileType)) {
          console.log(`${app.name} matched to ${department} department by partial profile type match`);
          return true;
        }
        
        // If profile type exists but doesn't match this department, exclude
        console.log(`${app.name} excluded from ${department} because profile type ${profileType} doesn't match`);
        return false;
      }
      
      // SECOND PRIORITY: CV department extraction
      const cvDepartment = extractDepartmentFromCV(app);
      if (cvDepartment) {
        const cvDeptMatch = cvDepartment.toLowerCase() === normalizedDepartment;
        if (cvDeptMatch) {
          console.log(`${app.name} matched to ${department} by CV content analysis`);
          return true;
        } else {
          console.log(`${app.name} excluded from ${department} because CV matches ${cvDepartment}`);
          return false;
        }
      }
      
      // THIRD PRIORITY: Job title
      const jobDepartment = getJobDepartment(app.jobTitle);
      if (jobDepartment.toLowerCase() === normalizedDepartment) {
        console.log(`${app.name} matched to ${department} by job title: ${app.jobTitle}`);
        return true;
      }
      
      // If we reach here, no match was found
      return false;
    });
  };

  // Add the missing functions back to the component
  const getApplicationStats = () => {
    return {
      total: applications.length,
      pending: applications.filter(app => app.status === 'pending').length,
      shortlisted: applications.filter(app => app.status === 'shortlisted').length,
      interviewed: applications.filter(app => app.status === 'interviewed').length,
      joined: applications.filter(app => app.status === 'joined').length,
      rejected: applications.filter(app => app.status === 'rejected').length
    };
  };

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    fetchApplications();
  };

  const handleViewApplication = async (application: Application) => {
    try {
      const fetchedApplication = await fetchApplicationById(application._id);
      if (fetchedApplication) {
        setSelectedApplication(fetchedApplication);
        setShowApplicationProfile(true);
      }
    } catch (error) {
      console.error('Error fetching application:', error);
    }
  };

  const fetchApplicationById = async (applicationId: string) => {
    const token = checkTokenValidity();
    if (!token) return;

    try {
      setLoading(true);
      const response = await axios.get(`http://localhost:5001/api/applications/${applicationId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setSelectedApplication(response.data);
    } catch (error) {
      console.error("Error fetching application:", error);
      setError("Failed to load application details");
    } finally {
      setLoading(false);
    }
  };

  const handleCloseProfile = () => {
    setSelectedApplication(null);
  };

  const canManageApplications = userRole === 'departmentHead';

  // Filter applications based on search query
  const filteredApplications = applications.filter(application => {
    if (!searchQuery) return true;
    
    const searchTerm = searchQuery.toLowerCase().trim();
    return (
      application.name?.toLowerCase().includes(searchTerm) ||
      application.email?.toLowerCase().includes(searchTerm)
    );
  });

  // Calculate pagination with filtered results
  const indexOfLastApplication = currentPage * applicationsPerPage;
  const indexOfFirstApplication = indexOfLastApplication - applicationsPerPage;
  const currentApplications = filteredApplications.slice(indexOfFirstApplication, indexOfLastApplication);
  const totalPages = Math.ceil(filteredApplications.length / applicationsPerPage);

  // Reset to first page when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Handle search with debounce
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
  };

  const getFilteredApplicationsByStatus = (status: string) => {
    return applications.filter(app => app.status === status.toLowerCase());
  };

  // Add function to get ranked applications
  const getRankedApplications = async () => {
    console.log("Getting ranked applications");
    
    const token = checkTokenValidity();
    if (!token) return [];
    
    try {
      // Fetch rankings from the server
      const response = await axios.get('http://localhost:5001/api/applications/ranking', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      console.log("Fetched rankings from server:", response.data);
      return response.data;
    } catch (error) {
      console.error("Error fetching rankings:", error);
      
      // Fallback to local filtering if API fails
      console.log("Falling back to local ranking calculation");
    
    // First, filter applications that have analysis data
    const filteredApps = applications.filter(app => {
      if (!app.analysis) {
        console.log(`Application ${app._id} (${app.name}) has no analysis data`);
        return false;
      }
      
      if (!app.analysis.score || !app.analysis.score.total) {
        console.log(`Application ${app._id} (${app.name}) has analysis but no score`);
        return false;
      }
      
      return true;
    });
    
    console.log("Applications with scores:", filteredApps.length);
    
      // If no applications have scores, return empty array
    if (filteredApps.length === 0) {
        console.log("No applications have scores");
        return [];
    }
    
    // Sort applications by score
    const sortedApps = [...filteredApps].sort((a, b) => {
      const scoreA = a.analysis?.score?.total || 0;
      const scoreB = b.analysis?.score?.total || 0;
      return scoreB - scoreA; // Sort in descending order
    });
    
    console.log("Sorted applications scores:", sortedApps.slice(0, 5).map(app => ({
      name: app.name,
      score: app.analysis?.score?.total
    })));
    
    return sortedApps;
    }
  };

  // Add this special function to handle analysis results immediately after they are processed
  const processAnalysisResult = (applicationId: string, analysisResult: any) => {
    console.log(`Processing analysis result for application ${applicationId}`);
    
    // Find the application in our current list
    const application = applications.find(app => app._id === applicationId);
    
    if (!application) {
      console.log(`Application ${applicationId} not found in current list, aborting processing`);
      return;
    }
    
    // Check for profile type in the analysis result
    if (analysisResult.profileType) {
      const profileType = analysisResult.profileType.toLowerCase();
      console.log(`Detected profile type: ${profileType} for ${application.name}`);
      
      // Determine which department this profile belongs to
      let targetDepartment = null;
      
      if (profileType === 'sales' || profileType.includes('sales')) {
        targetDepartment = 'sales';
        console.log(`${application.name} matched to SALES department by profile type`);
      } 
      else if (profileType === 'marketing' || profileType.includes('market')) {
        targetDepartment = 'marketing';
        console.log(`${application.name} matched to MARKETING department by profile type`);
      }
      else if (profileType === 'developer' || profileType === 'engineer' || 
              profileType.includes('develop') || profileType.includes('engineer')) {
        targetDepartment = 'engineering';
        console.log(`${application.name} matched to ENGINEERING department by profile type`);
      }
      
      // If we determined a department, add this application to its matches
      if (targetDepartment) {
        // Get current department matches
        const matchesJson = localStorage.getItem(`${targetDepartment}_matches`);
        const matches = matchesJson ? JSON.parse(matchesJson) : [];
        
        // Add this application if not already included
        if (!matches.includes(applicationId)) {
          matches.push(applicationId);
          
          // Save to all storage locations for persistence
          const matchesJson = JSON.stringify(matches);
          localStorage.setItem(`${targetDepartment}_matches`, matchesJson);
          localStorage.setItem(`permanent_${targetDepartment}_matches`, matchesJson);
          sessionStorage.setItem(`${targetDepartment}_matches`, matchesJson);
          
          console.log(`Added ${application.name} to ${targetDepartment} department matches`);
          
          // Remove from other departments for consistency
          const otherDepts = ['sales', 'marketing', 'engineering'].filter(d => d !== targetDepartment);
          
          otherDepts.forEach(dept => {
            const deptMatchesJson = localStorage.getItem(`${dept}_matches`);
            if (deptMatchesJson) {
              const deptMatches = JSON.parse(deptMatchesJson);
              if (deptMatches.includes(applicationId)) {
                const updated = deptMatches.filter((id: string) => id !== applicationId);
                localStorage.setItem(`${dept}_matches`, JSON.stringify(updated));
                localStorage.setItem(`permanent_${dept}_matches`, JSON.stringify(updated));
                sessionStorage.setItem(`${dept}_matches`, JSON.stringify(updated));
                console.log(`Removed ${application.name} from ${dept} department matches for consistency`);
              }
            }
          });
        }
      }
    }
  };

  // Update the useEffect monitoring CV analysis to use the processor
  useEffect(() => {
    // Watch for changes in applications, particularly analysis data
    const watchAnalysis = () => {
      applications.forEach(app => {
        // Check for freshly analyzed applications
        if (app.analysis?.profileType) {
          // Check if this is newly processed (in the last minute)
          const processedKey = `analysis_processed_${app._id}`;
          const lastProcessed = localStorage.getItem(processedKey);
          
          if (!lastProcessed) {
            console.log(`New analysis detected for ${app.name} with profile type ${app.analysis.profileType}`);
            // Process the analysis result
            processAnalysisResult(app._id, app.analysis);
            // Mark as processed with timestamp
            localStorage.setItem(processedKey, Date.now().toString());
          }
        }
      });
    };
    
    // Call immediately and set up interval
    if (applications.length > 0) {
      watchAnalysis();
      const intervalId = setInterval(watchAnalysis, 5000); // Check every 5 seconds
      
      // Clean up on unmount
      return () => clearInterval(intervalId);
    }
  }, [applications]);

  // Also add to the handleApplicationUpdate to ensure processing happens
  const handleApplicationUpdate = (applicationId: string, updatedApplication: any) => {
    // Update the application in state
    setApplications(prevApplications => 
      prevApplications.map(app => {
        if (app._id === applicationId) {
          // If this update includes analysis data, process it
          if (updatedApplication.analysis?.profileType) {
            console.log(`Processing new analysis from application update for ${updatedApplication.name}`);
            // Process immediately to ensure department matches are updated
            processAnalysisResult(applicationId, updatedApplication.analysis);
          }
          return updatedApplication;
        }
        return app;
      })
    );
  };

  // Improve the syncRankingDataWithDepartmentMatches function to properly handle profile types
  const syncRankingDataWithDepartmentMatches = () => {
    console.log('Synchronizing ranking data with department matches...');
    
    // First get all ranked applications
    getRankedApplications().then(rankedApps => {
      // Create a map of application ID to ranking data for quick lookup
      const rankingDataMap = new Map();
      
      rankedApps.forEach((rankedApp: any) => {
        // Extract the application ID (either directly or from applicationId field)
        const appId = rankedApp.applicationId || rankedApp._id;
        if (appId) {
          // Extract profile type with better detection
          let profileType = rankedApp.profileType || rankedApp.analysis?.profileType || 'Unknown';
          
          // Try to extract profile type from position field
          if (profileType === 'Unknown' && rankedApp.position) {
            const position = rankedApp.position.toLowerCase();
            if (position.includes('sales') || position.includes('account manager')) {
              profileType = 'Sales';
            } else if (position.includes('market') || position.includes('brand')) {
              profileType = 'Marketing';
            } else if (position.includes('develop') || position.includes('engineer') || 
                      position.includes('programm') || position.includes('tech')) {
              profileType = 'Developer';
            }
          }
          
          // Extract key skills more thoroughly
          let keySkills: string[] = [];
          
          // Try to get key skills from different possible sources
          if (rankedApp.keyStrengths && rankedApp.keyStrengths.length > 0) {
            keySkills = rankedApp.keyStrengths;
            console.log(`Found key skills from keyStrengths for ${rankedApp.candidate || rankedApp.name}`);
          } else if (rankedApp.keySkills && rankedApp.keySkills.length > 0) {
            keySkills = rankedApp.keySkills;
            console.log(`Found key skills from keySkills for ${rankedApp.candidate || rankedApp.name}`);
          } else if (rankedApp.analysis?.keySkills && rankedApp.analysis.keySkills.length > 0) {
            keySkills = rankedApp.analysis.keySkills;
            console.log(`Found key skills from analysis.keySkills for ${rankedApp.candidate || rankedApp.name}`);
          } else if (rankedApp.skills && rankedApp.skills.length > 0) {
            keySkills = rankedApp.skills;
            console.log(`Found key skills from skills for ${rankedApp.candidate || rankedApp.name}`);
          } else {
            // Try to extract from strength fields if they exist
            const strengths = [];
            if (rankedApp.adaptability) strengths.push('adaptability');
            if (rankedApp.teamLeadership) strengths.push('team leadership');
            if (rankedApp.analyticalThinking) strengths.push('analytical thinking');
            if (rankedApp.attentionToDetail) strengths.push('attention to detail');
            if (rankedApp.communication) strengths.push('communication');
            if (rankedApp.problemSolving) strengths.push('problem solving');
            
            if (strengths.length > 0) {
              keySkills = strengths;
              console.log(`Created key skills from strength fields for ${rankedApp.candidate || rankedApp.name}`);
            }
          }
          
          // Store the key data we want to preserve
          rankingDataMap.set(appId, {
            score: rankedApp.score || (rankedApp.analysis?.score?.total) || 0,
            keySkills: keySkills,
            profileType: profileType
          });
          
          if (keySkills && keySkills.length > 0) {
            console.log(`Stored ${keySkills.length} key skills for ${rankedApp.candidate || rankedApp.name}: ${keySkills.slice(0, 3).join(', ')}`);
          }
          
          console.log(`Set profile type for ${rankedApp.candidate || rankedApp.name} as: ${profileType}`);
        }
      });
      
      console.log(`Created ranking data map with ${rankingDataMap.size} entries`);
      
      // Now update each application in our main applications array
      const updatedApps = applications.map(app => {
        const rankingData = rankingDataMap.get(app._id);
        if (rankingData) {
          // Deep clone the application to avoid state mutation issues
          const updatedApp = {...app};
          
          // Create or update the analysis object with ranking data
          if (!updatedApp.analysis) {
            updatedApp.analysis = {};
          }
          
          // Preserve existing analysis data if available, otherwise use ranking data
          updatedApp.analysis.score = updatedApp.analysis.score || { total: rankingData.score };
          if (!updatedApp.analysis.score.total && rankingData.score) {
            updatedApp.analysis.score.total = rankingData.score;
          }
          
          // Always update profileType with the one from ranking data if available
          if (rankingData.profileType && rankingData.profileType !== 'Unknown') {
            console.log(`Updating ${app.name}'s profile type from ${updatedApp.analysis.profileType || 'none'} to ${rankingData.profileType}`);
            updatedApp.analysis.profileType = rankingData.profileType;
          }
          
          // Always update keySkills if we have them from ranking
          if (rankingData.keySkills && rankingData.keySkills.length > 0) {
            updatedApp.analysis.keySkills = rankingData.keySkills;
          } else if (!updatedApp.analysis.keySkills) {
            updatedApp.analysis.keySkills = [];
          }
          
          const skillsInfo = updatedApp.analysis.keySkills && updatedApp.analysis.keySkills.length > 0 
            ? `skills: ${updatedApp.analysis.keySkills.slice(0, 3).join(', ')}` 
            : 'no skills data';
            
          console.log(`Updated application ${app.name} with ranking data:`, {
            score: updatedApp.analysis.score.total,
            keySkills: skillsInfo,
            profileType: updatedApp.analysis.profileType
          });
          
          return updatedApp;
        }
        return app;
      });
      
      // Only update state if we actually made changes
      if (JSON.stringify(updatedApps) !== JSON.stringify(applications)) {
        console.log('Updating applications with ranking data');
        setApplications(updatedApps);
        
        // After updating, rebuild department matches
        setTimeout(() => {
          console.log('Rebuilding department matches after data sync');
          rebuildDepartmentMatches();
        }, 300);
      }
    }).catch(error => {
      console.error('Error syncing ranking data:', error);
    });
  };

  // Function to debug department assignments
  const logApplicationProfiles = (callLocation: string) => {
    console.log(`[DEBUG ${callLocation}] Logging all application profile types:`);
    
    applications.forEach(app => {
      const profileType = app.analysis?.profileType || 'Unknown';
      console.log(`Application ${app.name} (${app._id}) has profile type: ${profileType}`);
      
      // Check specifically for sales profiles
      if (profileType === 'Sales' || 
          profileType.toLowerCase().includes('sales') ||
          (app.jobTitle && app.jobTitle.toLowerCase().includes('sales'))) {
        console.log(`*** SALES CANDIDATE FOUND ***: ${app.name} with profile ${profileType}`);
      }
    });
  };

  // Update forceUpdateDepartmentAssignments to give highest priority to the profile type from CV analysis
  const forceUpdateDepartmentAssignments = () => {
    console.log('Force updating department assignments with CV analysis priority...');
    logApplicationProfiles('forceUpdateDepartmentAssignments');
    
    // Clear all department matches
    localStorage.removeItem('engineering_matches');
    localStorage.removeItem('marketing_matches');
    localStorage.removeItem('sales_matches');
    
    // Save a timestamp for cache validation
    localStorage.setItem('department_cache_timestamp', Date.now().toString());
    
    // Special debug for all applications with analysis profile
    applications.forEach(app => {
      if (app.analysis) {
        // Log profile type from analysis
        const cvProfileType = app.analysis.profileType;
        if (cvProfileType) {
          console.log(`Application ${app.name} has CV profile type: ${cvProfileType}`);
          
          // Check for sales specifically
          if (cvProfileType.toLowerCase() === 'sales') {
            console.log(`*** DETECTED SALES CV PROFILE ***: ${app.name} with CV profile ${cvProfileType}`);
          }
        }
      }
    });
    
    // First, look for applications with a Sales profile type - HIGHEST PRIORITY TO CV ANALYSIS
    const salesProfiles = applications.filter(app => {
      // Check if CV analysis explicitly says "sales" (HIGHEST PRIORITY)
      if (app.analysis?.profileType && app.analysis.profileType.toLowerCase() === 'sales') {
        console.log(`${app.name} matched to Sales department by EXACT CV profile type: ${app.analysis.profileType}`);
        return true;
      }
      
      // Next check for sales in the profile type
      if (app.analysis?.profileType && app.analysis.profileType.toLowerCase().includes('sales')) {
        console.log(`${app.name} matched to Sales department by CV profile containing 'sales': ${app.analysis.profileType}`);
        return true;
      }
      
      // Check for sales in summary
      if (app.analysis?.summary && app.analysis.summary.toLowerCase().includes('sales')) {
        console.log(`${app.name} matched to Sales department by CV summary containing 'sales'`);
        return true;
      }
      
      // Last priority - job title contains sales
      if (app.jobTitle && app.jobTitle.toLowerCase().includes('sales')) {
        console.log(`${app.name} matched to Sales department by job title: ${app.jobTitle}`);
        return true;
      }
      
      return false;
    });
    
    if (salesProfiles.length > 0) {
      console.log(`Found ${salesProfiles.length} applications with Sales profile type:`);
      salesProfiles.forEach(app => console.log(`- ${app.name} (${app._id})`));
      
      // Add to Sales department matches
      const salesMatches = salesProfiles.map(app => app._id);
      localStorage.setItem('sales_matches', JSON.stringify(salesMatches));
      console.log(`Added ${salesMatches.length} applications to Sales department matches: ${JSON.stringify(salesMatches)}`);
    }
    
    // Do the same for Marketing 
    const marketingProfiles = applications.filter(app => {
      // Check if CV analysis explicitly says "marketing" (HIGHEST PRIORITY)
      if (app.analysis?.profileType && 
          (app.analysis.profileType.toLowerCase() === 'marketing' || 
           app.analysis.profileType.toLowerCase() === 'marketer')) {
        console.log(`${app.name} matched to Marketing department by EXACT CV profile type`);
        return true;
      }
      
      // Next check for marketing in the profile type
      if (app.analysis?.profileType && app.analysis.profileType.toLowerCase().includes('market')) {
        console.log(`${app.name} matched to Marketing department by CV profile containing 'market'`);
        return true;
      }
      
      // Check for marketing in summary
      if (app.analysis?.summary && app.analysis.summary.toLowerCase().includes('marketing')) {
        console.log(`${app.name} matched to Marketing department by CV summary containing 'marketing'`);
        return true;
      }
      
      // Last priority - job title contains marketing
      if (app.jobTitle && app.jobTitle.toLowerCase().includes('market')) {
        console.log(`${app.name} matched to Marketing department by job title`);
        return true;
      }
      
      return false;
    });
    
    if (marketingProfiles.length > 0) {
      console.log(`Found ${marketingProfiles.length} applications with Marketing profile type`);
      const marketingMatches = marketingProfiles.map(app => app._id);
      localStorage.setItem('marketing_matches', JSON.stringify(marketingMatches));
      console.log(`Added ${marketingMatches.length} applications to Marketing department matches`);
    }
    
    // And for Engineering
    const engineeringProfiles = applications.filter(app => {
      // First check if this application is already matched to another department
      const isSales = salesProfiles.some(salesApp => salesApp._id === app._id);
      const isMarketing = marketingProfiles.some(marketingApp => marketingApp._id === app._id);
      
      // If already matched to another department, don't match to engineering
      if (isSales || isMarketing) {
        console.log(`${app.name} excluded from Engineering because already matched to another department`);
        return false;
      }
      
      // Check if CV analysis explicitly indicates developer/engineer (HIGHEST PRIORITY)
      if (app.analysis?.profileType && 
          (app.analysis.profileType.toLowerCase() === 'developer' || 
           app.analysis.profileType.toLowerCase() === 'engineer' ||
           app.analysis.profileType.toLowerCase().includes('develop') ||
           app.analysis.profileType.toLowerCase().includes('engineer'))) {
        console.log(`${app.name} matched to Engineering department by EXACT CV profile type`);
        return true;
      }
      
      // Check for technical terms in profile type
      if (app.analysis?.profileType && 
          (app.analysis.profileType.toLowerCase().includes('tech') ||
           app.analysis.profileType.toLowerCase().includes('program'))) {
        console.log(`${app.name} matched to Engineering department by CV profile containing technical terms`);
        return true;
      }
      
      // Last priority - job title contains technical terms
      if (app.jobTitle && 
          (app.jobTitle.toLowerCase().includes('develop') ||
           app.jobTitle.toLowerCase().includes('engineer') ||
           app.jobTitle.toLowerCase().includes('tech') ||
           app.jobTitle.toLowerCase().includes('program'))) {
        console.log(`${app.name} matched to Engineering department by job title`);
        return true;
      }
      
      return false;
    });
    
    if (engineeringProfiles.length > 0) {
      console.log(`Found ${engineeringProfiles.length} applications with Engineering profile type`);
      const engineeringMatches = engineeringProfiles.map(app => app._id);
      localStorage.setItem('engineering_matches', JSON.stringify(engineeringMatches));
      console.log(`Added ${engineeringMatches.length} applications to Engineering department matches`);
    }
    
    console.log('Department assignments updated successfully');
  };

  // Fix the type errors in the forceScanForMissingProfiles function
  const forceScanForMissingProfiles = () => {
    console.log('Force scanning for missing profile matches...');
    
    // Forced scan for sales profiles that might be incorrectly assigned
    applications.forEach(app => {
      // Check if there's a mismatch between profile type and department assignment
      if (app.analysis?.profileType && app.analysis.profileType.toLowerCase() === 'sales') {
        console.log(`CRITICAL: Detected Sales profile for ${app.name}, ensuring it appears in Sales department`);
        
        // Get current sales matches
        const salesMatchesJson = localStorage.getItem('sales_matches');
        const salesMatches = salesMatchesJson ? JSON.parse(salesMatchesJson) : [];
        
        // Add this application if not already included
        if (!salesMatches.includes(app._id)) {
          console.log(`Fixing: Adding ${app.name} to Sales department matches`);
          salesMatches.push(app._id);
          localStorage.setItem('sales_matches', JSON.stringify(salesMatches));
        }
        
        // Remove from other departments
        const engineeringMatchesJson = localStorage.getItem('engineering_matches');
        if (engineeringMatchesJson) {
          const engineeringMatches = JSON.parse(engineeringMatchesJson);
          if (engineeringMatches.includes(app._id)) {
            console.log(`Fixing: Removing ${app.name} from Engineering department matches`);
            const updated = engineeringMatches.filter((id: string) => id !== app._id);
            localStorage.setItem('engineering_matches', JSON.stringify(updated));
          }
        }
        
        const marketingMatchesJson = localStorage.getItem('marketing_matches');
        if (marketingMatchesJson) {
          const marketingMatches = JSON.parse(marketingMatchesJson);
          if (marketingMatches.includes(app._id)) {
            console.log(`Fixing: Removing ${app.name} from Marketing department matches`);
            const updated = marketingMatches.filter((id: string) => id !== app._id);
            localStorage.setItem('marketing_matches', JSON.stringify(updated));
          }
        }
      }
    });
  };

  // Add a new function to match applications specifically by profileType from analysis
  const matchByProfileType = (applications: Application[], targetDepartment: string): Application[] => {
    console.log(`Finding direct profileType matches for ${targetDepartment} department`);
    
    const normalizedDepartment = targetDepartment.toLowerCase();
    
    // Get all applications with a profile type
    const profileTypedApps = applications.filter(app => app.analysis?.profileType);
    console.log(`Found ${profileTypedApps.length} applications with profile type`);
    
    // Track unique applications by ID to avoid duplicates
    const uniqueApplicationIds = new Set<string>();
    
    // First: Create separate arrays for each department based on clear profile types
    const salesApps: Application[] = [];
    const marketingApps: Application[] = [];
    const engineeringApps: Application[] = [];
    
    // First pass: Categorize all applications with profile types into their correct departments
    // This ensures strict categorization based on profile type
    profileTypedApps.forEach(app => {
      // Skip if we've already added this application to prevent duplicates
      if (uniqueApplicationIds.has(app._id)) return;
      
      // Add null check to ensure profileType exists and convert to lowercase safely
      const profileType = app.analysis?.profileType?.toLowerCase() || '';
      
      // Assign to Sales department - highest priority for sales profiles
      if (profileType === 'sales' || profileType.includes('sales')) {
        salesApps.push(app);
        uniqueApplicationIds.add(app._id);
        console.log(`${app.name} categorized as SALES by profile type: ${profileType}`);
      }
      // Assign to Marketing department
      else if (profileType === 'marketing' || profileType.includes('market')) {
        marketingApps.push(app);
        uniqueApplicationIds.add(app._id);
        console.log(`${app.name} categorized as MARKETING by profile type: ${profileType}`);
      }
      // Assign to Engineering department
      else if (profileType === 'developer' || profileType === 'engineer' || 
               profileType.includes('develop') || profileType.includes('engineer')) {
        engineeringApps.push(app);
        uniqueApplicationIds.add(app._id);
        console.log(`${app.name} categorized as ENGINEERING by profile type: ${profileType}`);
      }
    });
    
    // Second pass: Check for job title matches only for applications that weren't categorized by profile type
    applications.forEach(app => {
      // Skip if we've already added this application
      if (uniqueApplicationIds.has(app._id)) return;
      
      // If no profile type, try to determine department from job title
      const jobTitle = app.jobTitle?.toLowerCase() || '';
      
      // For Engineering department specifically - avoid duplicates by checking email
      if (normalizedDepartment === 'engineering' && 
          (jobTitle.includes('developer') || jobTitle.includes('engineer') || 
           jobTitle.includes('developper') || jobTitle === 'developperrrr' || 
           jobTitle.includes('tech') || jobTitle.includes('zeryui'))) {
        
        // Additional check to avoid duplicates by email or job title for Engineering
        const isDuplicate = engineeringApps.some(existingApp => 
          existingApp.email === app.email || existingApp.jobTitle === app.jobTitle
        );
        
        if (!isDuplicate) {
          engineeringApps.push(app);
          uniqueApplicationIds.add(app._id);
          console.log(`${app.name} categorized as ENGINEERING by job title: ${jobTitle}`);
        } else {
          console.log(`Skipping duplicate engineering candidate: ${app.name} (${app.email})`);
        }
      }
      // For Sales department
      else if (normalizedDepartment === 'sales' && 
               (jobTitle.includes('sales') || jobTitle.includes('account') || jobTitle.includes('business'))) {
        salesApps.push(app);
        uniqueApplicationIds.add(app._id);
        console.log(`${app.name} categorized as SALES by job title: ${jobTitle}`);
      }
      // For Marketing department
      else if (normalizedDepartment === 'marketing' && 
               (jobTitle.includes('market') || jobTitle.includes('brand') || 
                jobTitle.includes('content') || jobTitle.includes('jhgfdsdfg'))) {
        marketingApps.push(app);
        uniqueApplicationIds.add(app._id);
        console.log(`${app.name} categorized as MARKETING by job title: ${jobTitle}`);
      }
    });
    
    // Return the specific department array based on the requested department
    if (normalizedDepartment === 'sales') {
      console.log(`Returning ${salesApps.length} sales applications`);
      return salesApps;
    } else if (normalizedDepartment === 'marketing') {
      console.log(`Returning ${marketingApps.length} marketing applications`);
      return marketingApps;
    } else if (normalizedDepartment === 'engineering') {
      console.log(`Returning ${engineeringApps.length} engineering applications`);
      return engineeringApps;
    }
    
    // Fallback - should never reach here
    console.log(`No matches found for ${targetDepartment} department`);
    return [];
  };

  // Add a trigger to sync ranking data when opening department matches
  const handleOpenRankingPopup = async () => {
    setShowRanking(true);
    setRankingsLoading(true);
    try {
      const rankings = await getRankedApplications();
      setRankedApplications(rankings);
      
      // After getting rankings, sync the data with department matches
      setTimeout(() => {
        syncRankingDataWithDepartmentMatches();
      }, 500);
    } catch (error) {
      console.error("Error loading rankings:", error);
    } finally {
      setRankingsLoading(false);
    }
  };

  // Update the handleDeleteCandidate function to also handle department matches cleanup
  const handleDeleteCandidate = async (application: any) => {
    const candidateName = application.candidate || application.name;
    const candidateId = application.applicationId || application._id;
    
    if (window.confirm(`Are you sure you want to delete the application for ${candidateName}?`)) {
      try {
        const token = checkTokenValidity();
        if (!token) return;
        
        setRankingsLoading(true);
        
        // Call the API to delete the application
        await axios.delete(`http://localhost:5001/api/applications/${candidateId}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        // Remove the deleted application from the rankings
        setRankedApplications(prevRankings => 
          prevRankings.filter(app => (app.applicationId || app._id) !== candidateId)
        );
        
        // Also remove from the main applications list if present
        setApplications(prevApplications => 
          prevApplications.filter(app => app._id !== candidateId)
        );
        
        // Remove from department matches in localStorage
        const departmentKeys = ['engineering', 'marketing', 'sales'];
        
        departmentKeys.forEach(dept => {
          // Remove from regular matches
          const matchesJson = localStorage.getItem(`${dept}_matches`);
          if (matchesJson) {
            try {
              const matches = JSON.parse(matchesJson);
              const updatedMatches = matches.filter((id: string) => id !== candidateId);
              localStorage.setItem(`${dept}_matches`, JSON.stringify(updatedMatches));
            } catch (e) {
              console.error(`Error updating ${dept} matches:`, e);
            }
          }
          
          // Remove from permanent matches
          const permanentMatchesJson = localStorage.getItem(`permanent_${dept}_matches`);
          if (permanentMatchesJson) {
            try {
              const permanentMatches = JSON.parse(permanentMatchesJson);
              const updatedMatches = permanentMatches.filter((id: string) => id !== candidateId);
              localStorage.setItem(`permanent_${dept}_matches`, JSON.stringify(updatedMatches));
            } catch (e) {
              console.error(`Error updating permanent ${dept} matches:`, e);
            }
          }
          
          // Also remove from sessionStorage if present
          const sessionMatchesJson = sessionStorage.getItem(`${dept}_matches`);
          if (sessionMatchesJson) {
            try {
              const sessionMatches = JSON.parse(sessionMatchesJson);
              const updatedMatches = sessionMatches.filter((id: string) => id !== candidateId);
              sessionStorage.setItem(`${dept}_matches`, JSON.stringify(updatedMatches));
            } catch (e) {
              console.error(`Error updating session ${dept} matches:`, e);
            }
          }
        });
        
        // If we're in a department view, update the selected department's matches
        if (selectedDepartment) {
          const updatedMatches = getApplicationsByDepartment(selectedDepartment)
            .filter(app => app._id !== candidateId);
          
          // If there are no matches left, close the department popup
          if (updatedMatches.length === 0) {
            setSelectedDepartment(null);
          }
        }
        
        alert('Candidate deleted successfully');
      } catch (error) {
        console.error('Error deleting application:', error);
        alert('Failed to delete candidate');
      } finally {
        setRankingsLoading(false);
      }
    }
  };

  // This specialized function will permanently fix misclassified applications
  const permanentlyFixMisclassifiedApplications = () => {
    console.log('PERMANENT FIX: Checking for and fixing misclassified applications...');
    
    // Clear localStorage caches to start fresh
    localStorage.removeItem('engineering_matches');
    localStorage.removeItem('marketing_matches');
    localStorage.removeItem('sales_matches');
    
    // Create empty arrays for each department
    const salesMatches: string[] = [];
    const marketingMatches: string[] = [];
    const engineeringMatches: string[] = [];
    
    // Track what we find for logging
    let salesProfilesFound = 0;
    let marketingProfilesFound = 0;
    let engineeringProfilesFound = 0;
    let fixedAssignments = 0;
    
    // Process each application one by one
    applications.forEach(app => {
      // Get profile type from CV analysis
      const profileType = app.analysis?.profileType;
      
      if (profileType) {
        const normalizedProfile = profileType.toLowerCase();
        
        // Check for sales profiles
        if (normalizedProfile === 'sales' || normalizedProfile.includes('sales')) {
          console.log(`PERMANENT FIX: ${app.name} has SALES profile type (${profileType})`);
          salesMatches.push(app._id);
          salesProfilesFound++;
          fixedAssignments++;
        }
        // Check for marketing profiles
        else if (normalizedProfile === 'marketing' || normalizedProfile.includes('market')) {
          console.log(`PERMANENT FIX: ${app.name} has MARKETING profile type (${profileType})`);
          marketingMatches.push(app._id);
          marketingProfilesFound++;
          fixedAssignments++;
        }
        // Check for engineering profiles
        else if (normalizedProfile === 'developer' || 
                 normalizedProfile === 'engineer' || 
                 normalizedProfile.includes('develop') || 
                 normalizedProfile.includes('engineer') || 
                 normalizedProfile.includes('tech')) {
          console.log(`PERMANENT FIX: ${app.name} has ENGINEERING profile type (${profileType})`);
          engineeringMatches.push(app._id);
          engineeringProfilesFound++;
          fixedAssignments++;
        }
        // Fallback for other profile types
        else {
          console.log(`PERMANENT FIX: ${app.name} has OTHER profile type (${profileType}), checking job title`);
          
          // Fallback to job title if profile type doesn't clearly indicate department
          const jobTitle = app.jobTitle?.toLowerCase() || '';
          
          if (jobTitle.includes('sales')) {
            console.log(`PERMANENT FIX: ${app.name} assigned to SALES based on job title containing 'sales'`);
            salesMatches.push(app._id);
            salesProfilesFound++;
            fixedAssignments++;
          }
          else if (jobTitle.includes('market')) {
            console.log(`PERMANENT FIX: ${app.name} assigned to MARKETING based on job title containing 'market'`);
            marketingMatches.push(app._id);
            marketingProfilesFound++;
            fixedAssignments++;
          }
          else if (jobTitle.includes('develop') || jobTitle.includes('engineer') || jobTitle.includes('tech')) {
            console.log(`PERMANENT FIX: ${app.name} assigned to ENGINEERING based on job title`);
            engineeringMatches.push(app._id);
            engineeringProfilesFound++;
            fixedAssignments++;
          }
          // If we still can't determine department, check CV content
          else if (app.coverLetter?.toLowerCase().includes('sales')) {
            console.log(`PERMANENT FIX: ${app.name} assigned to SALES based on cover letter content`);
            salesMatches.push(app._id);
            salesProfilesFound++;
            fixedAssignments++;
          }
          else {
            console.log(`PERMANENT FIX: Unable to classify ${app.name} with profile type ${profileType}`);
          }
        }
      }
      // If no profile type is available, use job title
      else if (app.jobTitle) {
        const jobTitle = app.jobTitle.toLowerCase();
        
        if (jobTitle.includes('sales')) {
          console.log(`PERMANENT FIX: ${app.name} assigned to SALES based on job title only`);
          salesMatches.push(app._id);
          salesProfilesFound++;
          fixedAssignments++;
        }
        else if (jobTitle.includes('market')) {
          console.log(`PERMANENT FIX: ${app.name} assigned to MARKETING based on job title only`);
          marketingMatches.push(app._id);
          marketingProfilesFound++;
          fixedAssignments++;
        }
        else if (jobTitle.includes('develop') || 
                 jobTitle.includes('engineer') || 
                 jobTitle.includes('tech') || 
                 jobTitle === 'developperrrr') {
          console.log(`PERMANENT FIX: ${app.name} assigned to ENGINEERING based on job title only`);
          engineeringMatches.push(app._id);
          engineeringProfilesFound++;
          fixedAssignments++;
        }
      }
    });
    
    // Save matches to localStorage with a permanent flag
    localStorage.setItem('sales_matches', JSON.stringify(salesMatches));
    localStorage.setItem('marketing_matches', JSON.stringify(marketingMatches));
    localStorage.setItem('engineering_matches', JSON.stringify(engineeringMatches));
    
    // Set timestamp to ensure we know when this was done
    localStorage.setItem('permanent_fix_timestamp', Date.now().toString());
    
    // Also store in an alternate location to ensure we can recover if needed
    localStorage.setItem('permanent_sales_matches', JSON.stringify(salesMatches));
    localStorage.setItem('permanent_marketing_matches', JSON.stringify(marketingMatches));
    localStorage.setItem('permanent_engineering_matches', JSON.stringify(engineeringMatches));
    
    // Store mapping of IDs to departments for reference
    const departmentMap: Record<string, string> = {};
    
    salesMatches.forEach(id => departmentMap[id] = 'Sales');
    marketingMatches.forEach(id => departmentMap[id] = 'Marketing');
    engineeringMatches.forEach(id => departmentMap[id] = 'Engineering');
    
    localStorage.setItem('application_departments', JSON.stringify(departmentMap));
    
    console.log(`PERMANENT FIX: Completed with ${fixedAssignments} assignments fixed`);
    console.log(`PERMANENT FIX: Found ${salesProfilesFound} Sales, ${marketingProfilesFound} Marketing, ${engineeringProfilesFound} Engineering profiles`);
    
    // Return department matches for easier access
    return {
      salesMatches,
      marketingMatches,
      engineeringMatches
    };
  };

  // Execute the permanent fix immediately on component mount
  useEffect(() => {
    const token = checkTokenValidity();
    if (token) {
      // Load applications and user role first
      Promise.all([fetchUserRole(), fetchApplications()]).then(() => {
        // After applications are loaded, perform the permanent fix
        setTimeout(() => {
          if (applications.length > 0) {
            console.log('Applications loaded, performing permanent department fix...');
            permanentlyFixMisclassifiedApplications();
          }
        }, 1000);
      });
    }
  }, []);

  // Add a special function to check for sales profiles directly
  const findAllSalesProfiles = (): Application[] => {
    // Directly search for sales profiles based on CV analysis, regardless of department
    return applications.filter(app => {
      // Check profile type
      if (app.analysis?.profileType) {
        const profileType = app.analysis.profileType.toLowerCase();
        if (profileType === 'sales' || profileType.includes('sales')) {
          return true;
        }
      }
      
      // Check cover letter
      if (app.coverLetter && app.coverLetter.toLowerCase().includes('sales')) {
        return true;
      }
      
      // Check job title
      if (app.jobTitle && app.jobTitle.toLowerCase().includes('sales')) {
        return true;
      }
      
      return false;
    });
  };

  // Add this crucial function to sync application analysis data with storage
  const forceRecoverAnalysisData = () => {
    console.log('FORCE RECOVERY: Directly recovering all CV analysis data from applications...');
    
    // Create direct mapping of application IDs by department
    const salesIds: string[] = [];
    const marketingIds: string[] = [];
    const engineeringIds: string[] = [];
    
    // Count for logging
    let recoveredCount = 0;
    
    // First, check all applications with explicit profileType
    applications.forEach(app => {
      // Skip apps without analysis
      if (!app.analysis?.profileType) return;
      
      const profileType = app.analysis.profileType.toLowerCase();
      let departmentMatched = false;
      
      // Check profile type directly
      if (profileType === 'sales' || profileType.includes('sales')) {
        if (!salesIds.includes(app._id)) {
          salesIds.push(app._id);
          departmentMatched = true;
          recoveredCount++;
          console.log(`RECOVERY: ${app.name} (${app._id}) → Sales department (profileType: ${profileType})`);
        }
      }
      else if (profileType === 'marketing' || profileType.includes('market')) {
        if (!marketingIds.includes(app._id)) {
          marketingIds.push(app._id);
          departmentMatched = true;
          recoveredCount++;
          console.log(`RECOVERY: ${app.name} (${app._id}) → Marketing department (profileType: ${profileType})`);
        }
      }
      else if (profileType === 'developer' || profileType === 'engineer' || 
               profileType.includes('develop') || profileType.includes('engineer')) {
        if (!engineeringIds.includes(app._id)) {
          engineeringIds.push(app._id);
          departmentMatched = true;
          recoveredCount++;
          console.log(`RECOVERY: ${app.name} (${app._id}) → Engineering department (profileType: ${profileType})`);
        }
      }
      
      // If we couldn't match by profile type, try using role
      if (!departmentMatched && app.analysis.role?.primaryRole) {
        const role = app.analysis.role.primaryRole.toLowerCase();
        
        if (role.includes('sales') || role.includes('business develop')) {
          if (!salesIds.includes(app._id)) {
            salesIds.push(app._id);
            recoveredCount++;
            console.log(`RECOVERY: ${app.name} (${app._id}) → Sales department (role: ${role})`);
          }
        }
        else if (role.includes('market') || role.includes('brand') || role.includes('content')) {
          if (!marketingIds.includes(app._id)) {
            marketingIds.push(app._id);
            recoveredCount++;
            console.log(`RECOVERY: ${app.name} (${app._id}) → Marketing department (role: ${role})`);
          }
        }
        else if (role.includes('develop') || role.includes('engineer') || role.includes('tech')) {
          if (!engineeringIds.includes(app._id)) {
            engineeringIds.push(app._id);
            recoveredCount++;
            console.log(`RECOVERY: ${app.name} (${app._id}) → Engineering department (role: ${role})`);
          }
        }
      }
    });
    
    // Save to ALL possible storage locations for maximum persistence
    const storeIds = (dept: string, ids: string[]) => {
      // Skip if empty
      if (ids.length === 0) return;
      
      // Convert to JSON once to avoid repeated work
      const idsJson = JSON.stringify(ids);
      
      // Store in localStorage (survives page refresh)
      localStorage.setItem(`${dept}_matches`, idsJson);
      localStorage.setItem(`permanent_${dept}_matches`, idsJson);
      
      // Also store in sessionStorage as backup (survives page refresh but not tab close)
      sessionStorage.setItem(`${dept}_matches`, idsJson);
      
      console.log(`RECOVERY: Saved ${ids.length} ${dept} matches to ALL storage locations`);
    };
    
    // Store all recovered IDs
    storeIds('sales', salesIds);
    storeIds('marketing', marketingIds);
    storeIds('engineering', engineeringIds);
    
    // Save recovery timestamp to track when this was done
    const timestamp = Date.now().toString();
    localStorage.setItem('analysis_data_recovered_at', timestamp);
    sessionStorage.setItem('analysis_data_recovered_at', timestamp);
    
    console.log(`RECOVERY COMPLETE: Recovered ${recoveredCount} application department assignments`);
    return recoveredCount;
  };

  // Modify the existing useEffect that runs on component mount
  useEffect(() => {
    const token = checkTokenValidity();
    if (token) {
      // Load applications and user role first
      Promise.all([fetchUserRole(), fetchApplications()]).then(() => {
        // After applications are loaded, force update department assignments
        setTimeout(() => {
          console.log('Initial load complete, recovering all CV analysis data...');
          
          // FIRST: Directly recover all analysis data from applications
          forceRecoverAnalysisData();
          
          // Then run the other persistence functions
          storeCVProfileTypesInLocalStorage();
          forceScanForMissingProfiles();
          forceUpdateDepartmentAssignments();
          saveAnalyzedApplicationsToDepartments();
          ensureAllAnalyzedApplicationsAssigned();
          
          // Force save the recovery flag to multiple locations
          const timestamp = Date.now().toString();
          localStorage.setItem('cv_analysis_recovered_flag', timestamp);
          sessionStorage.setItem('cv_analysis_recovered_flag', timestamp);
        }, 1000); 
      });
    }
  }, []); // Empty dependency array ensures this runs only once at component mount

  // Add a special function to directly load department matches regardless of storage location
  const loadDepartmentMatchesFromAllStorages = (department: string): string[] => {
    const normalizedDepartment = department.toLowerCase();
    
    // Try all possible storage keys in order of reliability
    const keys = [
      `permanent_${normalizedDepartment}_matches`, // Most reliable (permanent)
      `${normalizedDepartment}_matches`,          // Regular matches
      `${normalizedDepartment}_matches`           // Session storage
    ];
    
    // Storage locations to check
    const storages = [localStorage, sessionStorage];
    
    // Try each storage location and key
    for (const storage of storages) {
      for (const key of keys) {
        const matchesJson = storage.getItem(key);
        if (matchesJson) {
          try {
            const matchIds = JSON.parse(matchesJson);
            if (matchIds && matchIds.length > 0) {
              console.log(`LOADED ${matchIds.length} ${department} matches from ${key} in ${storage === localStorage ? 'localStorage' : 'sessionStorage'}`);
              return matchIds;
            }
          } catch (e) {
            console.error(`Error parsing ${key} from ${storage === localStorage ? 'localStorage' : 'sessionStorage'}:`, e);
          }
        }
      }
    }
    
    // If no matches found in any storage, return empty array
    return [];
  };

  // Improve the getApplicationsByDepartment function to use all storage locations
  const getApplicationsByDepartment = (department: string): Application[] => {
    console.log(`Getting applications for ${department} department...`);
    
    // If applications aren't loaded yet, return empty array
    if (applications.length === 0) {
      console.log('No applications loaded yet, returning empty array');
      return [];
    }
    
    // Try to force recover analysis data if nothing is found
    if (!localStorage.getItem(`${department.toLowerCase()}_matches`) && 
        !localStorage.getItem(`permanent_${department.toLowerCase()}_matches`)) {
      console.log(`No ${department} matches found in any storage, forcing recovery...`);
      forceRecoverAnalysisData();
    }
    
    // Load matches from all possible storage locations
    const matchIds = loadDepartmentMatchesFromAllStorages(department);
    
    // If we found match IDs, use them to filter applications
    if (matchIds.length > 0) {
      // Save to all storage locations to ensure persistence
      const matchIdsJson = JSON.stringify(matchIds);
      localStorage.setItem(`${department.toLowerCase()}_matches`, matchIdsJson);
      localStorage.setItem(`permanent_${department.toLowerCase()}_matches`, matchIdsJson);
      sessionStorage.setItem(`${department.toLowerCase()}_matches`, matchIdsJson);
      
      // Filter applications that match these IDs
      const matchedApps = applications.filter(app => matchIds.includes(app._id));
      
      // If we found matching applications, return them
      if (matchedApps.length > 0) {
        console.log(`Found ${matchedApps.length} applications for ${department} using stored matches`);
        return matchedApps;
      }
      
      // If no matching applications found despite having IDs, regenerate
      console.log(`No applications found matching the ${matchIds.length} stored IDs for ${department}`);
    }
    
    // Regenerate matches using the profile type matcher
    console.log(`Regenerating matches for ${department} department...`);
    const generatedMatches = matchByProfileType(applications, department);
    
    // Save the results to all storage locations
    if (generatedMatches.length > 0) {
      const newMatchIds = generatedMatches.map(app => app._id);
      const newMatchIdsJson = JSON.stringify(newMatchIds);
      
      // Save to all storage locations
      localStorage.setItem(`${department.toLowerCase()}_matches`, newMatchIdsJson);
      localStorage.setItem(`permanent_${department.toLowerCase()}_matches`, newMatchIdsJson);
      sessionStorage.setItem(`${department.toLowerCase()}_matches`, newMatchIdsJson);
      
      console.log(`Saved ${newMatchIds.length} regenerated matches for ${department} to all storage locations`);
    }
    
    return generatedMatches;
  };

  // Add a function to ensure all applications with analysis are assigned to departments
  const ensureAllAnalyzedApplicationsAssigned = () => {
    console.log('Ensuring all analyzed applications are assigned to departments...');
    
    // Check each application for analysis data
    let assignedCount = 0;
    
    applications.forEach(app => {
      if (!app.analysis) return;
      
      let assigned = false;
      
      // Check if this app is already in any department
      ['sales', 'marketing', 'engineering'].forEach(dept => {
        const matchesJson = localStorage.getItem(`${dept}_matches`);
        if (matchesJson) {
          const matches = JSON.parse(matchesJson);
          if (matches.includes(app._id)) {
            assigned = true;
            console.log(`${app.name} is already assigned to ${dept} department`);
          }
        }
      });
      
      // If not assigned to any department, try to assign based on analysis
      if (!assigned && app.analysis.profileType) {
        const profileType = app.analysis.profileType.toLowerCase();
        let department = '';
        
        if (profileType === 'sales' || profileType.includes('sales')) {
          department = 'sales';
        } else if (profileType === 'marketing' || profileType.includes('market')) {
          department = 'marketing';
        } else if (profileType === 'developer' || profileType === 'engineer' ||
                  profileType.includes('develop') || profileType.includes('engine')) {
          department = 'engineering';
        }
        
        if (department) {
          // Add to department matches
          const matchesJson = localStorage.getItem(`${department}_matches`);
          const matches = matchesJson ? JSON.parse(matchesJson) : [];
          
          if (!matches.includes(app._id)) {
            matches.push(app._id);
            localStorage.setItem(`${department}_matches`, JSON.stringify(matches));
            localStorage.setItem(`permanent_${department}_matches`, JSON.stringify(matches));
            console.log(`Assigned ${app.name} to ${department} department based on profile type: ${profileType}`);
            assignedCount++;
          }
        }
      }
    });
    
    console.log(`Assigned ${assignedCount} previously unassigned applications to departments`);
  };

  // Modify our component initialization useEffect to ensure all assignments
  useEffect(() => {
    if (applications.length > 0 && !loading) {
      console.log('Applications loaded, ensuring all department assignments are complete');
      
      // Run our assignment functions
      saveAnalyzedApplicationsToDepartments();
      ensureAllAnalyzedApplicationsAssigned();
      
      // Save timestamp of this initialization
      localStorage.setItem('department_assignments_initialized', Date.now().toString());
    }
  }, [applications.length]);

  // Add a special effect to handle application data changes
  useEffect(() => {
    // Only run if applications are loaded and not in loading state
    if (applications.length > 0 && !loading) {
      console.log(`Applications loaded (${applications.length}), ensuring CV analysis data is recovered...`);
      
      // Count applications with analysis data
      const withAnalysis = applications.filter(app => app.analysis?.profileType).length;
      console.log(`Found ${withAnalysis} applications with profile type analysis`);
      
      // Always force recover on load to ensure maximum persistence
      const recovered = forceRecoverAnalysisData();
      
      if (recovered > 0) {
        console.log(`Successfully recovered ${recovered} application assignments`);
      } else {
        console.log('No new application assignments to recover');
      }
    }
  }, [applications.length, loading]);

  // Add this function to remove a candidate from a department without deleting them from the database
  const handleRemoveFromDepartment = (application: Application, department: string) => {
    const candidateName = application.name;
    const candidateId = application._id;
    
    if (window.confirm(`Are you sure you want to remove ${candidateName} from the ${department} department?`)) {
      console.log(`Removing ${candidateName} (${candidateId}) from ${department} department`);
      
      // Remove from this specific department's matches in all storage locations
      const normalizedDept = department.toLowerCase();
      
      // Regular localStorage
      const matchesJson = localStorage.getItem(`${normalizedDept}_matches`);
      if (matchesJson) {
        try {
          const matches = JSON.parse(matchesJson);
          const updatedMatches = matches.filter((id: string) => id !== candidateId);
          localStorage.setItem(`${normalizedDept}_matches`, JSON.stringify(updatedMatches));
          console.log(`Removed from ${normalizedDept}_matches, ${updatedMatches.length} candidates remaining`);
        } catch (e) {
          console.error(`Error updating ${normalizedDept} matches:`, e);
        }
      }
      
      // Permanent localStorage
      const permanentMatchesJson = localStorage.getItem(`permanent_${normalizedDept}_matches`);
      if (permanentMatchesJson) {
        try {
          const permanentMatches = JSON.parse(permanentMatchesJson);
          const updatedMatches = permanentMatches.filter((id: string) => id !== candidateId);
          localStorage.setItem(`permanent_${normalizedDept}_matches`, JSON.stringify(updatedMatches));
          console.log(`Removed from permanent_${normalizedDept}_matches`);
        } catch (e) {
          console.error(`Error updating permanent ${normalizedDept} matches:`, e);
        }
      }
      
      // SessionStorage
      const sessionMatchesJson = sessionStorage.getItem(`${normalizedDept}_matches`);
      if (sessionMatchesJson) {
        try {
          const sessionMatches = JSON.parse(sessionMatchesJson);
          const updatedMatches = sessionMatches.filter((id: string) => id !== candidateId);
          sessionStorage.setItem(`${normalizedDept}_matches`, JSON.stringify(updatedMatches));
          console.log(`Removed from sessionStorage ${normalizedDept}_matches`);
        } catch (e) {
          console.error(`Error updating session ${normalizedDept} matches:`, e);
        }
      }
      
      // If we're in a department view, update the selected department's matches
      if (selectedDepartment && selectedDepartment.toLowerCase() === normalizedDept) {
        // Remove the application from the popup
        setSelectedDepartment(null); // Close the popup
        
        // Reopen with refreshed data
        setTimeout(() => {
          setSelectedDepartment(department);
        }, 100);
      }
      
      alert(`${candidateName} has been removed from the ${department} department`);
    }
  };

  const handleStatusChange = async () => {
    if (!selectedApplication) return;

    try {
      const response = await axios.put(
        `http://localhost:5001/api/applications/${selectedApplication._id}/status`,
        {
          status: newStatus,
          departmentHead: user?.name,
          ...(newStatus === 'interviewed' && {
            interviewDate,
            interviewTime
          })
        }
      );

      if (response.status === 200) {
        // Update the application in the state
        setApplications(applications.map(app => 
          app._id === selectedApplication._id 
            ? { ...app, status: newStatus, interviewDate, interviewTime, meetLink: response.data.meetLink }
            : app
        ));
        setShowStatusModal(false);
        setNewStatus('');
        setInterviewDate('');
        setInterviewTime('');
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  return (
    <>
      <PageMeta
        title="SmartHire"
        description="Dashboard Overview"
      />
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold">Dashboard</h2>
        <div className="flex gap-4">
          <div
            onClick={handleOpenRankingPopup}
            className="text-yellow-500 hover:text-yellow-600 cursor-pointer transition-colors duration-200 flex items-center"
            title="Candidate Rankings"
          >
            <FaTrophy className="w-8 h-8" />
            <span className="ml-1 font-semibold"></span>
          </div>
          <div
            onClick={() => navigate('/jobs')}
            className="text-gray-900 hover:text-gray-600 cursor-pointer transition-colors duration-200"
            title="Manage Jobs"
          >
            <JobIcon />
          </div>
        </div>
      </div>

      {/* Department Statistics Component */}
      <DepartmentStatistics applications={applications} />
      


      {/* Featured Candidates Component */}
      <FeaturedCandidates 
        applications={applications} 
        showTopCandidates={showTopCandidates}
        setShowTopCandidates={setShowTopCandidates}
        onViewApplication={handleViewApplication}
        handleDeleteCandidate={handleDeleteCandidate}
      />

      {/* Department Match Buttons */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="text-sm font-medium text-gray-600 self-center">Find department matches:</div>
        <button 
          onClick={() => handleDepartmentMatch('Engineering')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
        >
          <FilterIcon /> Engineering
        </button>
        <button 
          onClick={() => handleDepartmentMatch('Marketing')}
          className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
        >
          <FilterIcon /> Marketing
        </button>
        <button 
          onClick={() => handleDepartmentMatch('Sales')}
          className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
        >
          <FilterIcon /> Sales
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow duration-200" onClick={() => setSelectedStatus('total')}>
          <div className="text-gray-500 mb-2">Total Applications</div>
          <div className="text-2xl font-semibold">{getApplicationStats().total}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow duration-200" onClick={() => setSelectedStatus('pending')}>
          <div className="text-gray-500 mb-2">Pending</div>
          <div className="text-2xl font-semibold text-yellow-600">{getApplicationStats().pending}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow duration-200" onClick={() => setSelectedStatus('shortlisted')}>
          <div className="text-gray-500 mb-2">Shortlisted</div>
          <div className="text-2xl font-semibold text-blue-600">{getApplicationStats().shortlisted}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow duration-200" onClick={() => setSelectedStatus('interviewed')}>
          <div className="text-gray-500 mb-2">Interviewed</div>
          <div className="text-2xl font-semibold text-purple-600">{getApplicationStats().interviewed}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow duration-200" onClick={() => setSelectedStatus('joined')}>
          <div className="text-gray-500 mb-2">Joined</div>
          <div className="text-2xl font-semibold text-green-600">{getApplicationStats().joined}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow duration-200" onClick={() => setSelectedStatus('rejected')}>
          <div className="text-gray-500 mb-2">Rejected</div>
          <div className="text-2xl font-semibold text-red-600">{getApplicationStats().rejected}</div>
        </div>
      </div>

      {/* Status Popup */}
      {selectedStatus && (
        <StatusPopup
          status={selectedStatus}
          applications={selectedStatus === 'total' ? applications : getFilteredApplicationsByStatus(selectedStatus)}
          onClose={() => setSelectedStatus(null)}
          onViewApplication={handleViewApplication}
        />
      )}

      {/* Ranking Popup */}
      {showRanking && (
        <RankingPopup
          applications={rankedApplications}
          onClose={() => setShowRanking(false)}
          onViewApplication={handleViewApplication}
          onDeleteCandidate={handleDeleteCandidate}
          loading={rankingsLoading}
        />
      )}

      {/* Department Match Popup */}
      {selectedDepartment && (
        <DepartmentMatchPopup
          department={selectedDepartment}
          applications={getApplicationsByDepartment(selectedDepartment)}
          onClose={() => setSelectedDepartment(null)}
          onViewApplication={handleViewApplication}
          rankings={rankedApplications}
          onDeleteCandidate={handleDeleteCandidate}
          onRemoveFromDepartment={handleRemoveFromDepartment}
        />
      )}

      {/* Recent Applications with Search */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold">Recent Applications</h3>
          
          {/* Search Bar */}
          <div className="relative w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <SearchIcon />
            </div>
            <input
              type="text"
              placeholder="Search candidates..."
              value={searchQuery}
              onChange={handleSearch}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm"
            />
          </div>
        </div>
        
        {loading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading applications...</p>
          </div>
        ) : error ? (
          <div className="text-center py-4">
            <div className="text-red-600 mb-3">{error}</div>
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              Retry Loading
            </button>
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchQuery ? 'No matching candidates found' : 'No applications found'}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Candidate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Position
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Applied Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentApplications.map((application) => (
                    <tr key={application._id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {application.analysis?.score?.total && (
                            <div className="mr-3 flex items-center" title="Candidate Score">
                              <FaMedal 
                                className={
                                  application.analysis.score.total >= 80
                                    ? "text-green-500"
                                    : application.analysis.score.total >= 60
                                    ? "text-yellow-500"
                                    : "text-red-500"
                                } 
                                size={18}
                              />
                              <span className="ml-1 text-sm font-semibold">
                                {application.analysis.score.total}
                              </span>
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {application.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {application.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {application.jobTitle || 'Unknown Position'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {getJobDepartment(application.jobTitle)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(application.status)}`}>
                          {application.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(application.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="d-flex gap-2">
                          <button
                            onClick={() => handleViewApplication(application)}
                            className="text-primary hover:text-primary/80 p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
                            title="View Application"
                          >
                            <EyeIcon />
                          </button>
                          <button
                            onClick={() => handleDeleteCandidate(application)}
                            className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
                            title="Delete Candidate"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-4">
                <nav className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => prev - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1 rounded-md ${
                        currentPage === page
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </nav>
              </div>
            )}
          </>
        )}
      </div>

      {selectedApplication && (
        <ApplicationProfile
          application={selectedApplication}
          onClose={handleCloseProfile}
          onStatusUpdate={handleApplicationUpdate}
          userRole={userRole}
          onStatusChange={async (newStatus, interviewDate, interviewTime) => {
            try {
              const response = await axios.put(
                `http://localhost:5001/api/applications/${selectedApplication._id}/status`,
                {
                  status: newStatus,
                  departmentHead: user?.name,
                  ...(newStatus === 'interviewed' && {
                    interviewDate,
                    interviewTime
                  })
                }
              );

              if (response.status === 200) {
                // Update the application in the state
                setApplications(applications.map(app => 
                  app._id === selectedApplication._id 
                    ? { ...app, status: newStatus, interviewDate, interviewTime, meetLink: response.data.meetLink }
                    : app
                ));
                setShowApplicationProfile(false);
              }
            } catch (error) {
              console.error('Error updating status:', error);
              alert('Failed to update status. Please try again.');
            }
          }}
        />
      )}

      {/* Status Update Modal */}
      <Modal show={showStatusModal} onHide={() => setShowStatusModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Update Application Status</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>New Status</Form.Label>
              <Form.Select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
              >
                <option value="">Select Status</option>
                <option value="pending">Pending</option>
                <option value="reviewed">Reviewed</option>
                <option value="interviewed">Interviewed</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
              </Form.Select>
            </Form.Group>

            {newStatus === 'interviewed' && (
              <>
                <Form.Group className="mb-3">
                  <Form.Label>Interview Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={interviewDate}
                    onChange={(e) => setInterviewDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Interview Time</Form.Label>
                  <Form.Control
                    type="time"
                    value={interviewTime}
                    onChange={(e) => setInterviewTime(e.target.value)}
                    required
                  />
                </Form.Group>
              </>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowStatusModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleStatusChange}
            disabled={!newStatus || (newStatus === 'interviewed' && (!interviewDate || !interviewTime))}
          >
            Update Status
          </Button>
        </Modal.Footer>
      </Modal>

      {showApplicationProfile && selectedApplication && (
        <ApplicationProfile
          application={selectedApplication}
          onClose={handleCloseProfile}
          onUpdate={handleApplicationUpdate}
          onStatusChange={async (newStatus, interviewDate, interviewTime) => {
            try {
              const response = await axios.put(
                `http://localhost:5001/api/applications/${selectedApplication._id}/status`,
                {
                  status: newStatus,
                  departmentHead: user?.name,
                  ...(newStatus === 'interviewed' && {
                    interviewDate,
                    interviewTime
                  })
                }
              );

              if (response.status === 200) {
                // Update the application in the state
                setApplications(applications.map(app => 
                  app._id === selectedApplication._id 
                    ? { ...app, status: newStatus, interviewDate, interviewTime, meetLink: response.data.meetLink }
                    : app
                ));
                setShowApplicationProfile(false);
              }
            } catch (error) {
              console.error('Error updating status:', error);
              alert('Failed to update status. Please try again.');
            }
          }}
        />
      )}
    </>
  );
}
