export interface Workspace {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  ownerId: string;
}

export interface TeamMember {
  id: string;
  userId: string;
  workspaceId: string;
  role: 'owner' | 'admin' | 'member';
  email: string;
  name?: string;
  joinedAt: Date;
}

export interface WorkspaceInvitation {
  id: string;
  email: string;
  role: 'admin' | 'member';
  workspaceId: string;
  invitedBy: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: Date;
  expiresAt: Date;
}

export type BugStatus = 'OPEN' | 'IN_PROGRESS' | 'FIXED' | 'VERIFIED' | 'CLOSED' | 'REOPENED';
export type BugPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type BugSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Bug {
  id: string;
  title: string;
  description?: string;
  status: BugStatus;
  priority: BugPriority;
  severity: BugSeverity;
  stepsToReproduce?: string;
  environment?: string;
  browserInfo?: string;
  operatingSystem?: string;
  projectId: string;
  assigneeId?: string;
  reporterId: string;
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  assignee?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    imageUrl?: string;
  };
  reporter: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    imageUrl?: string;
  };
} 