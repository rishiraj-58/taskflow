export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  projectId: string;
  sprintId: string | null;
  createdAt: Date;
  updatedAt: Date;
  dueDate: string | null;
  assignee?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    imageUrl: string | null;
  } | null;
} 