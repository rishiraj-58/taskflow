"use client";

import { useState, useEffect, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList 
} from "@/components/ui/command";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onMentionsChange: (mentions: string[]) => void;
  projectId: string;
  placeholder?: string;
}

export function MentionInput({ value, onChange, onMentionsChange, projectId, placeholder }: MentionInputProps) {
  const [isMentioning, setIsMentioning] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionPosition, setMentionPosition] = useState(0);
  const [projectMembers, setProjectMembers] = useState<any[]>([]);
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const popoverTriggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchProjectMembers = async () => {
      try {
        // We get project members by fetching from any task in this project
        const response = await fetch(`/api/projects/${projectId}/members`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch project members");
        }
        
        const data = await response.json();
        setProjectMembers(data);
      } catch (error) {
        console.error("Error fetching project members:", error);
      }
    };

    fetchProjectMembers();
  }, [projectId]);

  // Forward mention changes to parent
  useEffect(() => {
    onMentionsChange(mentionedUserIds);
  }, [mentionedUserIds, onMentionsChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPosition = e.target.selectionStart || 0;
    
    onChange(newValue);
    
    // Check if we're in a mention context
    if (newValue[cursorPosition - 1] === '@') {
      setIsMentioning(true);
      setMentionPosition(cursorPosition);
      setMentionQuery("");
    } else if (isMentioning) {
      // Continue building the mention query
      const textAfterAt = newValue.slice(mentionPosition, cursorPosition);
      
      if (textAfterAt.includes(' ') || textAfterAt.includes('\n')) {
        // Space or newline terminates mention
        setIsMentioning(false);
      } else {
        setMentionQuery(textAfterAt);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Exit mention mode on escape
    if (e.key === 'Escape' && isMentioning) {
      setIsMentioning(false);
    }
  };

  const insertMention = (member: any) => {
    const beforeMention = value.slice(0, mentionPosition - 1); // Remove the @ character
    const afterMention = value.slice(mentionPosition + mentionQuery.length);
    const mentionText = `@${member.name} `;
    
    // Update the full text
    onChange(beforeMention + mentionText + afterMention);
    
    // Add the user ID to our list of mentioned users
    setMentionedUserIds(prev => {
      if (prev.includes(member.userId)) {
        return prev;
      }
      return [...prev, member.userId];
    });
    
    // Exit mention mode
    setIsMentioning(false);
    
    // Focus back on textarea and move cursor after the inserted mention
    if (textareaRef.current) {
      const newPosition = beforeMention.length + mentionText.length;
      
      setTimeout(() => {
        textareaRef.current?.focus();
        textareaRef.current?.setSelectionRange(newPosition, newPosition);
      }, 0);
    }
  };

  const filteredMembers = projectMembers.filter(
    member => 
      member.name.toLowerCase().includes(mentionQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || "Write a comment..."}
        className="min-h-[80px] resize-none"
      />
      
      <Popover open={isMentioning} onOpenChange={setIsMentioning}>
        {/* Hidden trigger for positioning */}
        <PopoverTrigger asChild>
          <div ref={popoverTriggerRef} className="absolute opacity-0 pointer-events-none" />
        </PopoverTrigger>
        
        <PopoverContent className="p-0 w-[250px]" align="start">
          <Command>
            <CommandInput placeholder="Search team members..." />
            <CommandList>
              <CommandEmpty>No members found</CommandEmpty>
              <CommandGroup>
                {filteredMembers.map(member => (
                  <CommandItem
                    key={member.userId}
                    onSelect={() => insertMention(member)}
                    className="flex items-center gap-2"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={`https://avatar.vercel.sh/${member.userId}`} />
                      <AvatarFallback className="text-xs">
                        {member.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{member.name}</span>
                      <span className="text-xs text-muted-foreground">{member.email}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
} 