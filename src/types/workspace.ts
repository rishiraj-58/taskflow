export interface Workspace {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  imageUrl?: string | null;
} 