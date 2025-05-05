import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Avatar,
  LinearProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  People as PeopleIcon,
  Schedule as ScheduleIcon,
  Assessment as AssessmentIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

const HRPanel = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [candidates, setCandidates] = useState([]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const recruitmentStages = [
    'Application Review',
    'Initial Screening',
    'Technical Assessment',
    'Interview',
    'Offer',
    'Hired'
  ];

  const CandidateCard = ({ candidate }) => (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar sx={{ mr: 2 }}>{candidate.name[0]}</Avatar>
          <Box>
            <Typography variant="h6">{candidate.name}</Typography>
            <Typography color="textSecondary">{candidate.position}</Typography>
          </Box>
        </Box>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="textSecondary">Current Stage:</Typography>
          <Chip
            label={candidate.stage}
            color={candidate.stage === 'Hired' ? 'success' : 'primary'}
            size="small"
          />
        </Box>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="textSecondary">Progress</Typography>
          <LinearProgress
            variant="determinate"
            value={(recruitmentStages.indexOf(candidate.stage) + 1) * (100 / recruitmentStages.length)}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>
      </CardContent>
      <CardActions>
        <Button size="small" startIcon={<ScheduleIcon />}>Schedule Interview</Button>
        <Button size="small" startIcon={<EditIcon />}>Update Status</Button>
        <Button size="small" startIcon={<AssessmentIcon />}>View Details</Button>
      </CardActions>
    </Card>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        {/* Header */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h4">Recruitment Dashboard</Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
            >
              Add New Candidate
            </Button>
          </Paper>
        </Grid>

        {/* Stats Overview */}
        <Grid item xs={12}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h6">Total Candidates</Typography>
                <Typography variant="h4">24</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h6">In Progress</Typography>
                <Typography variant="h4">18</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h6">Hired</Typography>
                <Typography variant="h4">4</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h6">Rejected</Typography>
                <Typography variant="h4">2</Typography>
              </Paper>
            </Grid>
          </Grid>
        </Grid>

        {/* Main Content */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              sx={{ borderBottom: 1, borderColor: 'divider' }}
            >
              <Tab label="Pipeline View" />
              <Tab label="Calendar" />
              <Tab label="Analytics" />
              <Tab label="Settings" />
            </Tabs>

            {/* Pipeline View */}
            {activeTab === 0 && (
              <Box sx={{ mt: 2 }}>
                <Grid container spacing={2}>
                  {recruitmentStages.map((stage) => (
                    <Grid item xs={12} md={4} key={stage}>
                      <Paper sx={{ p: 2 }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>{stage}</Typography>
                        {/* Sample Candidate Card */}
                        <CandidateCard
                          candidate={{
                            name: 'John Doe',
                            position: 'Software Engineer',
                            stage: stage,
                          }}
                        />
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}

            {/* Calendar View */}
            {activeTab === 1 && (
              <Box sx={{ mt: 2 }}>
                <Typography>Interview Calendar View</Typography>
                {/* Calendar component will be implemented here */}
              </Box>
            )}

            {/* Analytics View */}
            {activeTab === 2 && (
              <Box sx={{ mt: 2 }}>
                <Typography>Recruitment Analytics</Typography>
                {/* Analytics charts will be implemented here */}
              </Box>
            )}

            {/* Settings View */}
            {activeTab === 3 && (
              <Box sx={{ mt: 2 }}>
                <Typography>HR Panel Settings</Typography>
                {/* Settings form will be implemented here */}
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default HRPanel; 