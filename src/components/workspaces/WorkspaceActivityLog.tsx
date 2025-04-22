"use client";

import { useState, useEffect } from "react";
import { 
  Clock, 
  UserPlus, 
  UserMinus, 
  Edit, 
  Settings, 
  Loader2, 
  AlertCircle 
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

interface ActivityLog {
  id: string;
  entityId: string;
  entityType: string;
  action: string;
  description: string;
  userId: string;
  createdAt: Date;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    imageUrl?: string;
  };
}

interface WorkspaceActivityLogProps {
  workspaceId: string;
}

export default function WorkspaceActivityLog({ workspaceId }: WorkspaceActivityLogProps) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/workspaces/${workspaceId}/activities`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch activities");
        }
        
        const data = await response.json();
        
        // Convert dates from strings to Date objects
        const formattedActivities = data.map((activity: any) => ({
          ...activity,
          createdAt: new Date(activity.createdAt),
        }));
        
        setActivities(formattedActivities);
      } catch (err) {
        console.error("Error fetching activities:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [workspaceId]);

  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'INVITE_MEMBER':
      case 'ADD_MEMBER':
        return <UserPlus className="h-4 w-4 text-green-500" />;
      case 'REMOVE_MEMBER':
        return <UserMinus className="h-4 w-4 text-red-500" />;
      case 'UPDATE_WORKSPACE':
        return <Edit className="h-4 w-4 text-blue-500" />;
      case 'UPDATE_SETTINGS':
        return <Settings className="h-4 w-4 text-purple-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getInitials = (name: string) => {
    const names = name.split(' ');
    return names.length > 1
      ? `${names[0][0]}${names[1][0]}`.toUpperCase()
      : name.substring(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>See what's happening in your workspace</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>See what's happening in your workspace</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <p>Error loading activities: {error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>See what's happening in your workspace</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No activities yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-4">
                <div className="mt-1">{getActivityIcon(activity.action)}</div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={activity.user.imageUrl || ""} alt={`${activity.user.firstName} ${activity.user.lastName}`} />
                      <AvatarFallback>{getInitials(`${activity.user.firstName} ${activity.user.lastName}`)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{activity.user.firstName} {activity.user.lastName}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{activity.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(activity.createdAt, "PPp")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 