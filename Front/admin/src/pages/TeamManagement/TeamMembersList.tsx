import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface TeamMember {
  _id: string;
  name: string;
  email: string;
  role: string;
  profilePicture?: string;
}

const TeamMembersList = () => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Authentication token not found');
          setLoading(false);
          return;
        }

        const response = await axios.get('http://localhost:5001/api/users/by-role/candidate', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        setTeamMembers(response.data);
        setLoading(false);
      } catch (error: any) {
        console.error('Error fetching team members:', error);
        setError(error.response?.data?.message || 'Failed to fetch team members');
        setLoading(false);
      }
    };

    fetchTeamMembers();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-lg">Loading team members...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded bg-red-100 p-3 text-red-700">
        {error}
      </div>
    );
  }

  if (teamMembers.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        No team members found
      </div>
    );
  }

  return (
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
              Role
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {teamMembers.map((member) => (
            <tr key={member._id}>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  {member.profilePicture ? (
                    <img
                      src={`http://localhost:5001${member.profilePicture}`}
                      alt={member.name}
                      className="w-8 h-8 rounded-full mr-3"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-200 mr-3 flex items-center justify-center">
                      <span className="text-gray-500 text-sm">
                        {member.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {member.name}
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{member.email}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                  {member.role}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TeamMembersList; 