export interface CommunityIssue {
  id: string;
  category: string;
  lat: number;
  lng: number;
  severity: number;
  severity_level?: string;
  status: 'Pending' | 'In Progress' | 'Resolved';
  precedence: number;
  distance: string;
  imageUrl?: string;
  beforeImageUrl?: string;
  resolvedImageUrl?: string;
  workerNotes?: string;
  aiAdvice?: string;
  description?: string;
  resolution_feedback?: string;
}

export type InfrastructureIssue = CommunityIssue;

export interface UserAccount {
  id: string;
  fullName: string;
  email: string;
  password?: string; // used for mock auth representation
  role: 'citizen' | 'resolver' | 'admin';
  createdAt?: string;
}

