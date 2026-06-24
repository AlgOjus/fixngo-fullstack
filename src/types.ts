export interface CommunityIssue {
  id: string;
  category: string;
  lat: number;
  lng: number;
  severity: number;
  status: 'BROADCAST' | 'ASSIGNED' | 'RESOLVED';
  precedence: number;
  distance: string;
  imageUrl?: string;
  resolvedImageUrl?: string;
  workerNotes?: string;
  aiAdvice?: string;
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

