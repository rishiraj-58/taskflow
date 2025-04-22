"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { CommentForm } from "./CommentForm";
import { ArrowDown, ArrowUp, Reply, Paperclip } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DownloadAttachment } from "./DownloadAttachment";

interface CommentThreadProps {
  comment: any;
  projectId: string;
  taskId: string;
  onReplyAdded: (reply: any) => void;
}

export function CommentThread({ comment, projectId, taskId, onReplyAdded }: CommentThreadProps) {
  const [replyFormVisible, setReplyFormVisible] = useState(false);
  const [repliesOpen, setRepliesOpen] = useState(true);
  const hasReplies = comment.replies && comment.replies.length > 0;

  const formatCommentDate = (date: string) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };

  const handleReplyButtonClick = () => {
    setReplyFormVisible(!replyFormVisible);
  };

  const handleReplyAdded = (reply: any) => {
    setReplyFormVisible(false);
    setRepliesOpen(true);
    onReplyAdded(reply);
  };

  return (
    <Card className="border-muted bg-card">
      <CardHeader className="p-4 pb-2 flex flex-row items-start space-y-0 gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage 
            src={comment.author.imageUrl || `https://avatar.vercel.sh/${comment.author.id}`} 
            alt={`${comment.author.firstName} ${comment.author.lastName}`} 
          />
          <AvatarFallback>
            {comment.author.firstName.charAt(0)}
            {comment.author.lastName.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium">
                {comment.author.firstName} {comment.author.lastName}
              </span>
              <span className="text-xs text-muted-foreground ml-2">
                {formatCommentDate(comment.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 pt-2">
        <div className="prose prose-sm dark:prose-invert max-w-none mb-2">
          <p className="whitespace-pre-wrap">{comment.content}</p>
        </div>
        
        {comment.attachments && comment.attachments.length > 0 && (
          <div className="border rounded-md p-2 mt-3 bg-muted/40">
            <div className="text-xs font-medium mb-1 text-muted-foreground">Attachments:</div>
            <div className="grid gap-2">
              {comment.attachments.map((attachment: any) => (
                <DownloadAttachment key={attachment.id} attachment={attachment} />
              ))}
            </div>
          </div>
        )}
        
        {comment.mentions && comment.mentions.length > 0 && (
          <div className="mt-2 text-xs text-muted-foreground">
            <span className="font-medium">Mentioned: </span>
            {comment.mentions.map((mention: any, index: number) => (
              <span key={mention.id}>
                {mention.user.firstName} {mention.user.lastName}
                {index < comment.mentions.length - 1 ? ", " : ""}
              </span>
            ))}
          </div>
        )}
      </CardContent>
      
      <CardFooter className="p-3 pt-0 flex justify-between">
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-xs h-8"
          onClick={handleReplyButtonClick}
        >
          <Reply className="h-3.5 w-3.5 mr-1.5" />
          Reply
        </Button>
        
        {hasReplies && (
          <Collapsible open={repliesOpen} onOpenChange={setRepliesOpen} className="w-full mt-2">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="text-xs h-8">
                {repliesOpen ? (
                  <>
                    <ArrowUp className="h-3.5 w-3.5 mr-1.5" />
                    Hide {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                  </>
                ) : (
                  <>
                    <ArrowDown className="h-3.5 w-3.5 mr-1.5" />
                    View {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                  </>
                )}
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
        )}
      </CardFooter>
      
      {replyFormVisible && (
        <div className="px-4 pb-3">
          <CommentForm
            taskId={taskId}
            projectId={projectId}
            parentId={comment.id}
            onCommentAdded={handleReplyAdded}
            isReply
          />
        </div>
      )}
      
      {hasReplies && (
        <Collapsible open={repliesOpen} className="w-full">
          <CollapsibleContent className="pl-12 pr-4 pb-4 space-y-3">
            {comment.replies.map((reply: any) => (
              <Card key={reply.id} className="border-muted">
                <CardHeader className="p-3 pb-2 flex flex-row items-start space-y-0 gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage 
                      src={reply.author.imageUrl || `https://avatar.vercel.sh/${reply.author.id}`} 
                      alt={`${reply.author.firstName} ${reply.author.lastName}`} 
                    />
                    <AvatarFallback className="text-xs">
                      {reply.author.firstName.charAt(0)}
                      {reply.author.lastName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-sm">
                          {reply.author.firstName} {reply.author.lastName}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {formatCommentDate(reply.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="p-3 pt-0">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <p className="text-sm whitespace-pre-wrap">{reply.content}</p>
                  </div>
                  
                  {reply.attachments && reply.attachments.length > 0 && (
                    <div className="border rounded-md p-2 mt-2 bg-muted/40">
                      <div className="text-xs font-medium mb-1 text-muted-foreground">Attachments:</div>
                      <div className="grid gap-2">
                        {reply.attachments.map((attachment: any) => (
                          <DownloadAttachment key={attachment.id} attachment={attachment} />
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {reply.mentions && reply.mentions.length > 0 && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      <span className="font-medium">Mentioned: </span>
                      {reply.mentions.map((mention: any, index: number) => (
                        <span key={mention.id}>
                          {mention.user.firstName} {mention.user.lastName}
                          {index < reply.mentions.length - 1 ? ", " : ""}
                        </span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </Card>
  );
} 