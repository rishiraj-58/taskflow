"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Bell } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";

// Create context
type NotificationContextType = {
  notifications: any[];
  refreshNotifications: () => Promise<void>;
  markAsRead: (notificationId: string, navigate?: boolean, url?: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  unreadCount: number;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastCheckedAt, setLastCheckedAt] = useState(new Date());

  // Function to fetch notifications
  const fetchNotifications = async () => {
    try {
      const response = await fetch("/api/notifications");
      if (!response.ok) {
        throw new Error("Failed to fetch notifications");
      }
      const data = await response.json();
      setNotifications(data);
      
      // Count unread notifications
      const unread = data.filter((notification: any) => !notification.read).length;
      setUnreadCount(unread);
      
      return data;
    } catch (error) {
      console.error("Error fetching notifications:", error);
      return [];
    }
  };

  // Effect to fetch notifications on mount
  useEffect(() => {
    fetchNotifications();
    
    // Set up polling for new notifications every 30 seconds
    const intervalId = setInterval(() => {
      checkForNewNotifications();
    }, 30000);
    
    return () => clearInterval(intervalId);
  }, []);

  // Function to check for new notifications and show popups
  const checkForNewNotifications = async () => {
    const currentTime = new Date();
    const freshNotifications = await fetchNotifications();
    
    // Find notifications that arrived after lastCheckedAt
    const newNotifications = freshNotifications.filter((notification: any) => {
      const notificationDate = new Date(notification.createdAt);
      return notificationDate > lastCheckedAt && !notification.read;
    });
    
    // Show popup for each new notification
    newNotifications.forEach((notification: any) => {
      showNotificationPopup(notification);
    });
    
    // Update the last checked timestamp
    setLastCheckedAt(currentTime);
  };

  // Function to show a notification popup
  const showNotificationPopup = (notification: any) => {
    const { id } = toast({
      title: `${notification.comment.author.firstName} mentioned you`,
      description: (
        <div className="flex items-start gap-3 mt-2">
          <Avatar className="h-8 w-8">
            <AvatarImage 
              src={notification.comment.author.imageUrl || `https://avatar.vercel.sh/${notification.comment.author.id}`} 
              alt={`${notification.comment.author.firstName} ${notification.comment.author.lastName}`} 
            />
            <AvatarFallback>
              {notification.comment.author.firstName.charAt(0)}
              {notification.comment.author.lastName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="text-sm">
              <span className="font-medium">
                {notification.comment.task.title}
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
            </div>
          </div>
        </div>
      ),
      action: (
        <div className="cursor-pointer" onClick={() => handleNotificationClick(notification)}>
          View
        </div>
      ),
      duration: 5000,
    });
  };

  // Function to mark a notification as read
  const markAsRead = async (notificationId: string, navigate: boolean = false, url?: string) => {
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ notificationId }),
      });

      if (!response.ok) {
        throw new Error("Failed to mark notification as read");
      }

      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read: true } 
            : notification
        )
      );
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));

      if (navigate && url) {
        router.push(url);
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // Function to handle notification click
  const handleNotificationClick = (notification: any) => {
    // Create URL to the task
    const projectId = notification.comment.task.projectId;
    const taskId = notification.comment.task.id;
    const url = `/projects/${projectId}/tasks/${taskId}`;
    
    markAsRead(notification.id, true, url);
  };

  // Function to mark all notifications as read
  const markAllAsRead = async () => {
    try {
      const response = await fetch("/api/notifications", {
        method: "PUT",
      });

      if (!response.ok) {
        throw new Error("Failed to mark all notifications as read");
      }

      // Update local state
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, read: true }))
      );
      
      // Update unread count
      setUnreadCount(0);

      toast({
        title: "Success",
        description: "All notifications marked as read",
        duration: 3000,
      });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  // Provide context value
  const value = {
    notifications,
    refreshNotifications: fetchNotifications,
    markAsRead,
    markAllAsRead,
    unreadCount,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
} 