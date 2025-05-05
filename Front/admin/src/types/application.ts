export interface Application {
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
  source?: string;
  job?: string;
  updatedAt?: string;
  joinedDate?: string | null;
  analysis?: {
    score?: {
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
    summary?: string;
    profileType?: string;
    keySkills?: string[];
    technicalProficiency?: Record<string, string[]>;
    role?: {
      primaryRole: string;
      confidence: number;
      profileType: string;
      capabilities: Array<{
        name: string;
        confidence: number;
      }>;
    };
  };
} 