"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { CommentThread } from "./CommentThread";
import { CommentForm } from "./CommentForm";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, MessageSquare } from "lucide-react";

interface CommentListProps {
  taskId: string;
  projectId: string;
}

export function CommentList({ taskId, projectId }: CommentListProps) {
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<Date>(new Date());
  const [pollingEnabled, setPollingEnabled] = useState(true);
  
  // Store a reference to the real projectId if we have to look it up
  const actualProjectIdRef = useRef<string>(projectId);
  
  // Function to fetch comments that can be called repeatedly
  const fetchComments = useCallback(async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) {
        setLoading(true);
      }
      
      console.log(`Fetching comments for task ${taskId} in project ${actualProjectIdRef.current || 'UNDEFINED'}`);
      
      // If we don't have a projectId yet, we need to look it up
      if (!actualProjectIdRef.current) {
        console.log("ProjectId is missing, fetching task info first");
        const taskResponse = await fetch(`/api/debug/task/${taskId}`);
        
        if (!taskResponse.ok) {
          const errorData = await taskResponse.json();
          console.error("Error verifying task:", errorData);
          throw new Error(errorData.error || "Failed to verify task");
        }
        
        const taskData = await taskResponse.json();
        console.log("Task data for comments:", taskData);
        
        // If we have a project ID from the task data, use that
        if (taskData.task.projectId) {
          actualProjectIdRef.current = taskData.task.projectId;
          console.log(`Using correct projectId: ${actualProjectIdRef.current}`);
        } else {
          throw new Error("Could not determine project for this task");
        }
      }
      
      // Fetch comments with the correct projectId
      const response = await fetch(`/api/projects/${actualProjectIdRef.current}/tasks/${taskId}/comments`);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error response from comments API:", errorData);
        throw new Error(errorData.error || "Failed to fetch comments");
      }
      
      const data = await response.json();
      
      // Update the timestamp for future comparisons
      setLastFetchTime(new Date());
      
      // Update comments, preserving optimistic updates
      setComments(prevComments => {
        // If it's the first load, just return the new data
        if (isInitialLoad || prevComments.length === 0) {
          return data;
        }
        
        // Handle updates by comparing timestamps
        const updatedComments = data.map((newComment: any) => {
          // Find the matching comment in our current state
          const existingComment = prevComments.find((c: any) => c.id === newComment.id);
          
          if (!existingComment) {
            // This is a new comment
            return newComment;
          }
          
          // Merge replies, preserving any optimistic updates
          const combinedReplies = [...newComment.replies];
          
          // Add any optimistic reply updates that might not be in the server response yet
          if (existingComment.replies) {
            existingComment.replies.forEach((reply: any) => {
              const replyExists = combinedReplies.some((r: any) => r.id === reply.id);
              if (!replyExists) {
                combinedReplies.push(reply);
              }
            });
          }
          
          return {
            ...newComment,
            replies: combinedReplies
          };
        });
        
        // Add any comments that are in the current state but not in the server response
        // (likely optimistic updates that haven't been saved to the server yet)
        prevComments.forEach((comment: any) => {
          const exists = updatedComments.some((c: any) => c.id === comment.id);
          if (!exists) {
            updatedComments.push(comment);
          }
        });
        
        return updatedComments;
      });
    } catch (err) {
      console.error("Error fetching comments:", err);
      if (isInitialLoad) {
        setError(err instanceof Error ? err.message : "Failed to load comments");
      }
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      }
    }
  }, [taskId]);

  // Initial fetch on component mount
  useEffect(() => {
    fetchComments(true);
  }, [fetchComments]);
  
  // Set up polling for comments
  useEffect(() => {
    if (!pollingEnabled) return;
    
    // Poll for new comments every 10 seconds
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchComments(false);
      }
    }, 10000);
    
    // Clean up the interval on unmount
    return () => clearInterval(intervalId);
  }, [fetchComments, pollingEnabled]);
  
  // Handle document visibility changes to pause/resume polling
  useEffect(() => {
    const handleVisibilityChange = () => {
      setPollingEnabled(document.visibilityState === 'visible');
      
      // Fetch latest when tab becomes visible again
      if (document.visibilityState === 'visible') {
        fetchComments(false);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchComments]);

  const handleNewComment = (newComment: any) => {
    setComments(prev => [newComment, ...prev]);
  };

  const handleReplyAdded = (parentId: string, reply: any) => {
    setComments(prev => 
      prev.map(comment => 
        comment.id === parentId
          ? { ...comment, replies: [...(comment.replies || []), reply] }
          : comment
      )
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <CommentForm
        taskId={taskId}
        projectId={actualProjectIdRef.current || projectId}
        onCommentAdded={handleNewComment}
      />
      
      {comments.length === 0 ? (
        <div className="text-center py-8 border rounded-md bg-muted/50">
          <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No comments yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <CommentThread
              key={comment.id}
              comment={comment}
              projectId={actualProjectIdRef.current || projectId}
              taskId={taskId}
              onReplyAdded={(reply) => handleReplyAdded(comment.id, reply)}
            />
          ))}
        </div>
      )}
    </div>
  );
} 