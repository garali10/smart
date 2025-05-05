import React from 'react';
import PageMeta from "../../components/common/PageMeta";

const HRPanel: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState(0);

  const recruitmentStages = [
    'Application Review',
    'Initial Screening',
    'Technical Assessment',
    'Interview',
    'Offer',
    'Hired'
  ];

  return (
    <>
      <PageMeta title="Recruitment Dashboard" description="Manage recruitment process" />
      <div className="p-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-primary">Recruitment Panel</h1>
          <button className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 flex items-center gap-2">
            <span className="material-icons">add</span>
            Add New Candidate
          </button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <div className="text-primary text-4xl mb-2">24</div>
            <div className="text-gray-600">Total Candidates</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <div className="text-primary text-4xl mb-2">18</div>
            <div className="text-gray-600">In Progress</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <div className="text-green-500 text-4xl mb-2">4</div>
            <div className="text-gray-600">Hired</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <div className="text-red-500 text-4xl mb-2">2</div>
            <div className="text-gray-600">Rejected</div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <div className="flex gap-6">
              {['Pipeline View', 'Calendar', 'Analytics', 'Settings'].map((tab, index) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(index)}
                  className={`pb-4 px-2 ${
                    activeTab === index
                      ? 'border-b-2 border-primary text-primary'
                      : 'text-gray-500 hover:text-primary'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Pipeline View */}
          {activeTab === 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recruitmentStages.map((stage) => (
                <div key={stage} className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-4 pb-2 border-b-2 border-primary">
                    {stage}
                  </h3>
                  {/* Candidate Card */}
                  <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center">
                        JD
                      </div>
                      <div>
                        <div className="font-semibold">John Doe</div>
                        <div className="text-sm text-gray-600">Software Engineer</div>
                      </div>
                    </div>
                    <div className="mb-4">
                      <div className="text-sm text-gray-600 mb-1">Current Stage:</div>
                      <span className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary">
                        {stage}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button className="text-sm text-primary hover:text-primary/80">
                        Schedule
                      </button>
                      <button className="text-sm text-primary hover:text-primary/80">
                        Update
                      </button>
                      <button className="text-sm text-primary hover:text-primary/80">
                        Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Calendar View */}
          {activeTab === 1 && (
            <div className="text-center py-12">
              <h3 className="text-xl text-primary mb-4">Interview Calendar</h3>
              <p className="text-gray-600">Calendar feature coming soon...</p>
            </div>
          )}

          {/* Analytics View */}
          {activeTab === 2 && (
            <div className="text-center py-12">
              <h3 className="text-xl text-primary mb-4">Recruitment Analytics</h3>
              <p className="text-gray-600">Analytics feature coming soon...</p>
            </div>
          )}

          {/* Settings View */}
          {activeTab === 3 && (
            <div className="text-center py-12">
              <h3 className="text-xl text-primary mb-4">HR Panel Settings</h3>
              <p className="text-gray-600">Settings feature coming soon...</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default HRPanel; 