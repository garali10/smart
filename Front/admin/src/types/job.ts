export interface JobListing {
  _id?: string;
  title: string;
  department: string;
  location: string;
  type: 'full-time' | 'part-time' | 'contract' | 'internship';
  experience: string;
  description: string;
  salary: {
    min: number;
    max: number;
  };
  status: 'active' | 'draft';
  deadline: string;
  postedDate?: string;
} 