import React, { useState, useEffect } from 'react';
import PageMeta from "../../components/common/PageMeta";
import { FaSearch, FaFilter, FaPlus, FaTimes } from 'react-icons/fa';
import axios from 'axios';

interface Candidate {
  _id: string;
  name: string;
  email: string;
  position?: string;
  company?: string;
  profilePicture?: string;
  jobTitle?: string;
  status?: string;
  createdAt?: string;
  appliedOn?: string;
  applicationStatus?: string;
  coverLetter?: string;
  phoneNumber?: string;
  user?: any;
}

interface UniqueCandidate {
  _id: string;
  name: string;
  email: string;
  profilePicture?: string;
  company?: string;
  latestApplication?: Candidate;
  applications: Candidate[];
}

const HRPanel: React.FC = () => {
  const [applications, setApplications] = useState<Candidate[]>([]);
  const [uniqueCandidates, setUniqueCandidates] = useState<UniqueCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<UniqueCandidate | null>(null);
  const [showCandidateModal, setShowCandidateModal] = useState(false);

  // Application statuses
  const applicationStatuses = [
    'Under Review',
    'Shortlisted',
    'Interviewed',
    'Joined',
    'Not Selected'
  ];

  // Fetch candidates data
  useEffect(() => {
    const fetchCandidates = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await axios.get('http://localhost:5001/api/applications', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        // Transform the data to match our candidate interface
        const transformedData = await Promise.all(response.data.map(async (item: any) => {
          // Attempt to get the profile picture if user ID exists
          let profilePic = item.profilePicture;
          if (item.user?._id) {
            try {
              const userResponse = await axios.get(`http://localhost:5001/api/users/${item.user._id}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              
              if (userResponse.data?.profilePicture) {
                const cleanPath = userResponse.data.profilePicture
                  .replace('/api/uploads/', '')
                  .replace('api/uploads/', '')
                  .replace('/profile-pictures/', '')
                  .replace('profile-pictures/', '');
                
                const filename = cleanPath.split('/').pop() || cleanPath;
                profilePic = filename;
              }
            } catch (err) {
              console.error('Error fetching user profile picture:', err);
            }
          }

          return {
            _id: item._id,
            name: item.name || 'Unknown',
            email: item.email || 'No email',
            company: getCompanyFromApplication(item),
            position: item.jobTitle || 'Unknown Position',
            profilePicture: profilePic,
            status: item.status || 'pending',
            jobTitle: item.jobTitle || 'developperrrr',
            phoneNumber: item.phone || '',
            createdAt: item.createdAt,
            // Format the date or use a placeholder
            appliedOn: item.createdAt ? formatDate(new Date(item.createdAt)) : 'Unknown',
            // Randomly assign an application status for demonstration
            applicationStatus: getRandomApplicationStatus(item._id),
            coverLetter: item.coverLetter || 'No cover letter provided.',
            user: item.user
          };
        }));

        setApplications(transformedData);

        // Group applications by candidate email (unique identifier)
        const candidateMap = new Map<string, UniqueCandidate>();
        
        transformedData.forEach(app => {
          if (!candidateMap.has(app.email)) {
            candidateMap.set(app.email, {
              _id: app.user?._id || app._id,
              name: app.name,
              email: app.email,
              profilePicture: app.profilePicture,
              company: app.company,
              latestApplication: app,
              applications: [app]
            });
          } else {
            const candidate = candidateMap.get(app.email)!;
            candidate.applications.push(app);
            
            // Check if this is a more recent application
            if (new Date(app.createdAt || '') > new Date(candidate.latestApplication?.createdAt || '')) {
              candidate.latestApplication = app;
            }
          }
        });
        
        setUniqueCandidates(Array.from(candidateMap.values()));
      } catch (error) {
        console.error('Error fetching candidates:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCandidates();
  }, []);

  // Helper function to format date
  const formatDate = (date: Date): string => {
    try {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Helper function to get profile picture URL 
  const getProfilePictureUrl = (filename: string | undefined): string => {
    if (!filename) return 'https://via.placeholder.com/40';
    if (filename.startsWith('http')) return filename;
    return `http://localhost:5001/api/auth/upload/${filename}`;
  };

  // Helper function to get company info from application
  const getCompanyFromApplication = (application: any): string => {
    // Try to extract company from various fields
    const jobTitle = application.jobTitle || '';
    if (jobTitle.includes('at')) {
      return jobTitle.split('at')[1].trim();
    }
    
    // Random company names for demo purposes
    const companies = [
      'O\'Reilly-Treutel', 
      'Rogahn and Sons', 
      'Zemlak Inc', 
      'Rau-White', 
      'Bauch Inc', 
      'Frami Group',
      'Ferry, Gusikowski and Kerluke',
      'Christiansen-Kilback'
    ];
    
    // Get a stable random company based on candidate ID
    const hash = application._id?.split('').reduce((a: number, b: string) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    return companies[Math.abs(hash) % companies.length];
  };

  // Get a random application status for demonstration
  const getRandomApplicationStatus = (id: string): string => {
    const hash = id.split('').reduce((a: number, b: string) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    return applicationStatuses[Math.abs(hash) % applicationStatuses.length];
  };

  // Filter candidates based on search query
  const filteredCandidates = uniqueCandidates.filter(candidate => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      candidate.name.toLowerCase().includes(query) ||
      candidate.email.toLowerCase().includes(query) ||
      candidate.latestApplication?.position?.toLowerCase().includes(query) ||
      candidate.company?.toLowerCase().includes(query)
    );
  });

  // Handler for selecting a candidate and showing the modal
  const handleCandidateSelect = (candidate: UniqueCandidate) => {
    setSelectedCandidate(candidate);
    setShowCandidateModal(true);
  };

  // Handler for closing the candidate modal
  const handleCloseModal = () => {
    setShowCandidateModal(false);
    setSelectedCandidate(null);
  };

  // Get status color based on application status
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'Under Review':
        return 'bg-yellow-100 text-yellow-800';
      case 'Shortlisted':
        return 'bg-blue-100 text-blue-800';
      case 'Interviewed':
        return 'bg-purple-100 text-purple-800';
      case 'Joined':
        return 'bg-green-100 text-green-800';
      case 'Not Selected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <>
      <PageMeta title="Candidates List" description="View and manage candidates" />
      <div className="p-6 max-w-full">
        {/* Search and Filter Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search candidates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
        </div>

        {/* Candidates Table */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredCandidates.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No candidates found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 border">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Applied On
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCandidates.map((candidate) => (
                  <tr 
                    key={candidate._id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleCandidateSelect(candidate)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          <div className="h-10 w-10 rounded-full overflow-hidden bg-gray-100">
                            {candidate.profilePicture ? (
                              <img 
                                src={getProfilePictureUrl(candidate.profilePicture)}
                                alt={candidate.name}
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/40';
                                  console.error('Error loading profile image, using fallback');
                                }}
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center bg-blue-500 text-white">
                                {candidate.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{candidate.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {candidate.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {candidate.latestApplication?.appliedOn}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Candidate Profile Modal */}
      {showCandidateModal && selectedCandidate && (
        <div className="fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl mx-4 relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={handleCloseModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <FaTimes className="w-5 h-5" />
            </button>
            
            <h2 className="text-2xl font-medium mb-6">Candidate Profile</h2>
            
            <div className="flex flex-col md:flex-row gap-6 mb-6">
              <div className="flex-shrink-0">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100">
                  {selectedCandidate.profilePicture ? (
                    <img 
                      src={getProfilePictureUrl(selectedCandidate.profilePicture)}
                      alt={selectedCandidate.name}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/96';
                        console.error('Error loading profile image in modal, using fallback');
                      }}
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-blue-500 text-white text-3xl">
                      {selectedCandidate.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex-grow">
                <h3 className="text-xl font-medium">{selectedCandidate.name}</h3>
                <p className="text-gray-600 mb-2">{selectedCandidate.email}</p>
                
                <div className="space-y-3 mt-4">
                  <p><span className="font-medium">Phone:</span> {selectedCandidate.latestApplication?.phoneNumber || 'Not provided'}</p>
                  <p><span className="font-medium">Applied for:</span> {selectedCandidate.latestApplication?.jobTitle}</p>
                  <p><span className="font-medium">Applied on:</span> {selectedCandidate.latestApplication?.appliedOn}</p>
                </div>
              </div>
            </div>
            
            {/* Applications List */}
            <div className="mt-6">
              <h4 className="text-lg font-medium mb-4">All Applications</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 border">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Position
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Applied On
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedCandidate.applications.map((application) => (
                      <tr key={application._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {application.jobTitle}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(application.applicationStatus || '')}`}>
                            {application.applicationStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {application.appliedOn}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="mt-6">
              <h4 className="text-lg font-medium mb-2">Latest Cover Letter</h4>
              <div className="p-4 bg-gray-50 rounded-md text-gray-700">
                {selectedCandidate.latestApplication?.coverLetter || 'No cover letter provided.'}
              </div>
            </div>
            
            <div className="flex justify-end mt-6 space-x-3">
              <button 
                className="px-4 py-2 bg-gray-100 rounded-lg text-gray-700 hover:bg-gray-200"
                onClick={handleCloseModal}
              >
                Close
              </button>
              <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                Schedule Interview
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default HRPanel; 