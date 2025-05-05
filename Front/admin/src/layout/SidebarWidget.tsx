import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaUserFriends, FaUsers, FaChevronRight } from 'react-icons/fa';

// Define the candidate type
interface Candidate {
  _id: string;
  name: string;
  email: string;
  profilePicture?: string;
}

export default function SidebarWidget() {
  const [showCandidates, setShowCandidates] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const toggleCandidatesList = () => {
    setShowCandidates(!showCandidates);
    if (!showCandidates && candidates.length === 0) {
      fetchCandidates();
    }
  };
  
  const viewAllCandidates = () => {
    setShowCandidates(false);
    navigate('/recruitment');
  };

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

      setCandidates(response.data.slice(0, 5)); // Limit to 5 candidates for the widget
    } catch (error) {
      console.error('Error fetching candidates:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={toggleCandidatesList}
        className="text-white text-2xl p-3 rounded-md hover:bg-red-700 transition-colors"
        title="View Candidates"
      >
        <FaUserFriends />
      </button>

      {showCandidates && (
        <div className="absolute left-full ml-2 top-0 w-80 bg-white rounded-lg shadow-xl z-50 border border-gray-200">
          <div className="p-3 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-semibold">Recent Candidates</h3>
            <button 
              onClick={() => setShowCandidates(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="max-h-80 overflow-y-auto p-2">
            {loading ? (
              <div className="flex justify-center items-center p-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-700"></div>
              </div>
            ) : candidates.length === 0 ? (
              <p className="text-center text-gray-500 p-4">No candidates found</p>
            ) : (
              <ul>
                {candidates.map((candidate) => (
                  <li key={candidate._id} className="py-2 px-3 hover:bg-gray-50 rounded-lg">
                    <Link to={`/recruitment?candidateId=${candidate._id}`} className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
                        {candidate.profilePicture ? (
                          <img 
                            src={`http://localhost:5001/uploads/profile-pictures/${candidate.profilePicture}`} 
                            alt={candidate.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/40';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-red-600 text-white">
                            {candidate.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">{candidate.name}</p>
                        <p className="text-xs text-gray-500">{candidate.email}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          <div className="p-3 border-t border-gray-200">
            <button
              onClick={viewAllCandidates}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              <FaUsers /> 
              <span>View All Candidates</span>
              <FaChevronRight className="ml-1 text-sm" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
