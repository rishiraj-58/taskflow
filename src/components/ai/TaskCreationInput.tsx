"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, Plus, Sparkles, User } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { formatDateString, isDateInPast, getRelativeDateDescription } from "@/lib/date-utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TaskForm } from "@/components/tasks/TaskForm";

interface TaskCreationInputProps {
  projectId?: string;
  sprintId?: string;
  onTaskCreated?: (task: any) => void;
  className?: string;
}

interface ContextOption {
  id: string;
  name: string;
  description?: string;
}

interface ProjectMember {
  id: string;
  userId: string;
  name: string;
  email?: string;
  description?: string;
}

export function TaskCreationInput({
  projectId,
  sprintId,
  onTaskCreated,
  className = "",
}: TaskCreationInputProps) {
  const [command, setCommand] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([
    "Create a high priority task for updating user documentation due next Friday",
    "Add a bug fix task for login page error",
    "New task for implementing dark mode",
  ]);
  const [showContextDialog, setShowContextDialog] = useState(false);
  const [contextType, setContextType] = useState<string>("");
  const [contextMessage, setContextMessage] = useState<string>("");
  const [contextOptions, setContextOptions] = useState<ContextOption[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>("");
  const [extractedParams, setExtractedParams] = useState<any>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [taskToCreate, setTaskToCreate] = useState<any>(null);
  const [debugOutput, setDebugOutput] = useState<string>("");
  const [showTaskForm, setShowTaskForm] = useState<boolean>(false);
  const [formInitialValues, setFormInitialValues] = useState<any>(null);
  const [selectedProject, setSelectedProject] = useState<{id: string, name: string} | null>(null);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Debug function to directly test the API
  const testApiDirectly = async () => {
    setDebugOutput("Testing API directly...");
    try {
      const testCommand = "Create a new task in the Logistics project to update the shipment tracking system";
      const response = await axios.post("/api/ai/parse-task", {
        command: testCommand
      });
      
      setDebugOutput(
        "API Response: " + 
        JSON.stringify(response.data, null, 2)
      );
      
      // Check if we have missing context
      if (response.data.missingContext) {
        const options = response.data.missingContext.options || [];
        setDebugOutput(prev => 
          prev + "\n\nMissing Context: " + 
          response.data.missingContext.type + 
          "\nOptions: " + JSON.stringify(options, null, 2)
        );
      }
    } catch (error) {
      setDebugOutput("Error testing API: " + (error instanceof Error ? error.message : String(error)));
    }
  };

  // Focus the input when component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
    // Run the test on component mount
    testApiDirectly();
  }, []);

  // Fetch project-specific suggestions when projectId changes
  useEffect(() => {
    if (projectId) {
      fetchProjectDetails();
    }
  }, [projectId]);

  // Fetch project details for better suggestions
  const fetchProjectDetails = async () => {
    if (!projectId) return;
    
    try {
      const response = await axios.get(`/api/projects/${projectId}`);
      const projectData = response.data;
      
      // Set project-specific suggestions
      setSuggestions([
        `Create a high priority task for updating ${projectData.name} documentation due next Friday`,
        `Add a bug fix task for ${projectData.name} login issue`,
        `New feature task for ${projectData.name}: implement dark mode`,
        `Create a task to review the ${projectData.name} database schema`,
        `Assign a bug fix task to Beena for the ${projectData.name} project`,
      ]);
      
      // Also fetch project members for assignee selection
      fetchProjectMembers(projectId);
    } catch (error) {
      console.error("Error fetching project details:", error);
    }
  };

  // Add a method to fetch project members
  const fetchProjectMembers = async (projId: string) => {
    try {
      const response = await axios.get(`/api/projects/${projId}/members`);
      const members = response.data.map((member: any) => ({
        id: member.id,
        userId: member.userId,
        name: member.name,
        email: member.email
      }));
      setProjectMembers(members);
      console.log("Project members:", members);
    } catch (error) {
      console.error("Error fetching project members:", error);
    }
  };

  // Handle submitting the command
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!command.trim() || isLoading) return;
    
    setIsLoading(true);
    
    // Log the command for debugging
    console.log("Processing command:", command);
    console.log("Current project ID:", projectId);
    
    // Extract project name for debugging
    const projectName = extractProjectNameFromCommand(command);
    if (projectName) {
      console.log("Detected project name:", projectName);
    }
    
    try {
      // Use the parse-task endpoint first to extract parameters
      const parseResponse = await axios.post("/api/ai/parse-task", {
        command,
        projectId // Pass the current project ID from the UI if available
      });
      
      const parseData = parseResponse.data;
      console.log("API Response:", parseData);
      
      // Now check if we need context or can create the task directly
      if (parseData.missingContext) {
        console.log("Missing context:", parseData.missingContext);
        console.log("Context options:", parseData.missingContext.options);
        
        // Need more context from user
        setContextType(parseData.missingContext.type);
        setContextMessage(parseData.missingContext.message);
        
        // Ensure options are properly formatted
        let formattedOptions = parseData.missingContext.options?.map((option: any) => {
          console.log("Processing option:", option);
          
          // If it's already an object with id and name, just return it
          if (option && typeof option === 'object' && option.id && option.name) {
            return option;
          }
          
          // Convert string options to proper objects if needed
          if (typeof option === 'string') {
            // Check for format: "Project Name (Active, id: abc123)"
            const idMatch = option.match(/^(.*?)\s+\(.*?id:\s*([^),]+)/);
            if (idMatch) {
              return {
                id: idMatch[2].trim(), // Use the actual ID
                name: idMatch[1].trim(),
                description: option.substring(idMatch[1].length).trim()
              };
            }
            
            // Check for format: "Project Name (Active)"
            const statusMatch = option.match(/^(.*?)\s+\((.*?)\)$/);
            if (statusMatch) {
              return {
                id: statusMatch[1].trim(), // Use the name as ID
                name: statusMatch[1].trim(),
                description: statusMatch[2].trim()
              };
            }
            
            // Fallback for simple string
            return { 
              id: option,
              name: option 
            };
          }
          
          // Fallback for any other format
          return {
            id: String(option),
            name: String(option)
          };
        }) || [];
        
        // If this is project selection and we have a project name from the command,
        // add an option to create that project
        if (parseData.missingContext.type === 'project' && projectName) {
          // Add a "Create New Project" option at the top
          formattedOptions = [
            {
              id: 'create_new',
              name: `Create "${projectName}" Project`,
              description: 'Create a new project with this name'
            },
            ...formattedOptions
          ];
        }
        
        // For assignee selection, fetch project members if necessary
        if (parseData.missingContext.type === 'assignee' && parseData.parameters?.projectId) {
          // If we have a project ID but no formatted options, fetch team members
          if (formattedOptions.length === 0) {
            try {
              await fetchProjectMembers(parseData.parameters.projectId);
              
              // Use the freshly fetched project members
              formattedOptions = projectMembers.map(member => ({
                id: member.userId,
                name: member.name,
                description: member.email
              }));
              
              // Add unassigned option
              formattedOptions.unshift({
                id: "",
                name: "Unassigned",
                description: "Leave task unassigned"
              });
            } catch (error) {
              console.error("Error fetching project members for assignee selection:", error);
            }
          }
          
          // Store the project details for later use
          setSelectedProject({
            id: parseData.parameters.projectId,
            name: parseData.parameters.projectName || "Selected Project"
          });
        }
        
        console.log("Formatted options:", formattedOptions);
        setContextOptions(formattedOptions);
        setExtractedParams(parseData.parameters || {});
        setSelectedOption(formattedOptions[0]?.id || "");
        
        // Check if we have project suggestions
        if (parseData.missingContext.type === 'project') {
          // Add option to create a new project if mentioned in command but not found
          if (projectName) {
            toast.info(`Project "${projectName}" not found. You can select an existing project or create a new one.`, {
              duration: 5000,
              action: {
                label: 'Create Project',
                onClick: () => router.push('/projects/new')
              }
            });
          }
        }
        
        setShowContextDialog(true);
      } else if (parseData.type === "CREATE_TASK" && parseData.parameters) {
        // We have task parameters, show full task form for user to complete
        setExtractedParams(parseData.parameters);
        
        // Check if the parameters include a project ID and fetch project details
        if (parseData.parameters.projectId) {
          fetchProjectById(parseData.parameters.projectId).then(project => {
            if (project) {
              setSelectedProject(project);
              
              // Also fetch project members for assignee selection
              fetchProjectMembers(parseData.parameters.projectId);
            }
          });
        }
        
        // Prepare initial values for the form
        const initialValues = {
          title: parseData.parameters.title || "",
          description: parseData.parameters.description || "",
          priority: parseData.parameters.priority || "medium",
          status: parseData.parameters.status || "todo",
          dueDate: parseData.parameters.dueDate ? new Date(parseData.parameters.dueDate) : null,
          assigneeId: parseData.parameters.assigneeId || null,
        };
        
        setFormInitialValues(initialValues);
        setShowTaskForm(true);
      } else {
        // Error or unsupported action
        toast.error(parseData.error || "Failed to understand the command");
      }
    } catch (error) {
      console.error("Error processing command:", error);
      toast.error("An error occurred while processing your command");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle context selection and task creation
  const handleContextConfirm = async () => {
    if (!selectedOption && contextType !== 'dueDate') {
      toast.error("Please select an option");
      return;
    }
    
    setIsLoading(true);
    setShowContextDialog(false);
    
    try {
      console.log("Selected option:", selectedOption);
      const selectedContextOption = contextOptions.find(option => option.id === selectedOption);
      console.log("Selected context option:", selectedContextOption);
      
      // Update the parameters with the selected context
      const updatedParams = { ...extractedParams };
      
      // Apply the selected context
      switch (contextType) {
        case 'project':
          // Check if this is the "Create New Project" option
          if (selectedOption === 'create_new') {
            // Navigate to the new project creation page
            router.push('/projects/new');
            return; // Exit early without creating a task
          }
          
          // For projects, the actual ID might be in the description if formatted as "Project Name (Active, id: abc123)"
          if (selectedContextOption) {
            const idMatch = selectedContextOption.description?.match(/id: ([^)]+)/);
            if (idMatch && idMatch[1]) {
              updatedParams.projectId = idMatch[1].trim();
              console.log("Extracted project ID from description:", updatedParams.projectId);
            } else {
              updatedParams.projectId = selectedOption;
              console.log("Using selected option as project ID:", updatedParams.projectId);
            }
            
            // Store the project details for display
            setSelectedProject({
              id: updatedParams.projectId,
              name: selectedContextOption.name
            });
          } else {
            updatedParams.projectId = selectedOption;
          }
          break;
        case 'sprint':
          updatedParams.sprintId = selectedOption;
          break;
        case 'assignee':
          updatedParams.assigneeId = selectedOption;
          break;
        case 'priority':
          updatedParams.priority = selectedOption;
          break;
        case 'dueDate':
          // Make sure selectedOption is a string before creating a Date
          if (selectedOption) {
            try {
              const selectedDate = new Date(selectedOption);
              
              // Check if the date is in the past
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              
              if (selectedDate < today) {
                // Show warning about past due date
                setIsLoading(false);
                
                const confirmPastDate = window.confirm(
                  `The selected date (${selectedDate.toLocaleDateString()}) is in the past. Are you sure you want to set a past due date?`
                );
                
                if (!confirmPastDate) {
                  // User canceled, show the dialog again
                  setShowContextDialog(true);
                  return;
                }
                // Otherwise continue with the past date
              }
              
              updatedParams.dueDate = selectedDate;
            } catch (e) {
              console.error("Invalid date:", e);
              toast.error("Invalid date format");
              setIsLoading(false);
              return;
            }
          } else {
            updatedParams.dueDate = null;
          }
          break;
      }
      
      console.log("Updated parameters for task creation:", updatedParams);
      
      // Instead of creating the task directly, show the full form with pre-filled values
      const initialValues = {
        title: updatedParams.title || "",
        description: updatedParams.description || "",
        priority: updatedParams.priority || "medium",
        status: updatedParams.status || "todo",
        dueDate: updatedParams.dueDate,
        assigneeId: updatedParams.assigneeId,
      };
      
      setExtractedParams(updatedParams);
      setFormInitialValues(initialValues);
      setShowTaskForm(true);
      
    } catch (error: any) {
      console.error("Error processing context selection:", error);
      toast.error("An error occurred while processing your selection");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    setCommand(suggestion);
    inputRef.current?.focus();
  };

  // Add a method to fetch project details by ID
  const fetchProjectById = async (projectId: string) => {
    try {
      const response = await axios.get(`/api/projects/${projectId}`);
      return {
        id: response.data.id,
        name: response.data.name
      };
    } catch (error) {
      console.error("Error fetching project details:", error);
      return null;
    }
  };

  // Add a method to handle task creation from the full form
  const handleTaskFormSuccess = (task: any) => {
    console.log("Task created successfully:", task);
    
    // Add project name to the task for display
    const createdTask = {
      ...task,
      projectName: selectedProject?.name || task.project?.name || "Unknown Project"
    };
    
    setTaskToCreate(createdTask);
    setCommand("");
    setShowTaskForm(false);
    setShowConfirmation(true);
    
    // Call the onTaskCreated callback if provided
    if (onTaskCreated) {
      onTaskCreated(createdTask);
    }
  };

  // Add back the handleTaskConfirm function
  const handleTaskConfirm = () => {
    setShowConfirmation(false);
    
    // Call the onTaskCreated callback if provided
    if (onTaskCreated && taskToCreate) {
      onTaskCreated(taskToCreate);
    }
    
    toast.success(`Task created: ${taskToCreate?.title}`);
    
    // Navigate to the task if created
    if (taskToCreate?.id && (taskToCreate?.projectId || taskToCreate?.project?.id)) {
      router.push(`/projects/${taskToCreate.projectId || taskToCreate.project?.id}/tasks/${taskToCreate.id}`);
    }
  };

  // When a context type is 'assignee', handle showing members for selection
  useEffect(() => {
    if (contextType === 'assignee' && selectedProject?.id) {
      fetchProjectMembers(selectedProject.id);
    }
  }, [contextType, selectedProject]);

  return (
    <>
      <Card className={`p-2 ${className}`}>
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <Input
            ref={inputRef}
            placeholder="Create a task using natural language..."
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading} size="sm">
            {isLoading ? (
              <Loader2 size={16} className="animate-spin mr-2" />
            ) : (
              <Sparkles size={16} className="mr-2" />
            )}
            Create
          </Button>
        </form>
        
        {suggestions.length > 0 && (
          <div className="mt-2">
            <p className="text-xs text-muted-foreground mb-1">Suggestions:</p>
            <div className="flex flex-wrap gap-1">
              {suggestions.map((suggestion, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary/10 transition-colors text-xs"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  {suggestion}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {/* Debug output */}
        {debugOutput && (
          <div className="mt-4 p-2 bg-gray-100 rounded text-xs whitespace-pre-wrap max-h-40 overflow-auto">
            <div className="font-bold mb-1">Debug Output:</div>
            {debugOutput}
          </div>
        )}
      </Card>
      
      {/* Context Selection Dialog */}
      {showContextDialog && (
        <Dialog open={showContextDialog} onOpenChange={(open) => {
          if (!open && !selectedOption) {
            // If dialog is closed without selection, reset everything
            setShowContextDialog(false);
            setContextOptions([]);
            setSelectedOption(null);
            setIsLoading(false);
          } else {
            setShowContextDialog(open);
          }
        }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{formatContextTypeTitle(contextType)} Required</DialogTitle>
              <DialogDescription>
                {contextType === 'project' 
                  ? "Please select a project and fill in task details" 
                  : contextType === 'sprint' 
                    ? "Please select a sprint for this task"
                    : contextType === 'assignee'
                      ? "Please select an assignee for this task"
                      : contextType === 'dueDate'
                        ? "Please select a due date for this task"
                        : "Please select an option"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {contextType === 'dueDate' ? (
                <div className="grid gap-2">
                  <Label htmlFor="dueDate">Due Date</Label>
                  <input
                    type="date"
                    id="dueDate"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={selectedOption || new Date().toISOString().split('T')[0]}
                    onChange={(e) => setSelectedOption(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              ) : contextType === 'project' ? (
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label>Project</Label>
                    <RadioGroup value={selectedOption || ""} onValueChange={setSelectedOption}>
                      <div className="grid gap-2 max-h-40 overflow-y-auto">
                        {contextOptions.map((option) => (
                          <div key={option.id} className="flex items-center space-x-2">
                            <RadioGroupItem value={option.id} id={option.id} />
                            <Label htmlFor={option.id} className="flex flex-col cursor-pointer">
                              <span className="font-medium">{option.name}</span>
                              {option.description && (
                                <span className="text-sm text-muted-foreground">{option.description}</span>
                              )}
                            </Label>
                          </div>
                        ))}
                        {contextOptions.length === 0 && (
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="create_new" id="create_new" />
                            <Label htmlFor="create_new" className="flex flex-col cursor-pointer">
                              <span className="font-medium">Create New Project</span>
                              <span className="text-sm text-muted-foreground">No projects found. Create a new one.</span>
                            </Label>
                          </div>
                        )}
                      </div>
                    </RadioGroup>
                  </div>
                  
                  {/* Additional task details */}
                  <div className="grid gap-2">
                    <Label htmlFor="taskTitle">Task Title</Label>
                    <Input
                      id="taskTitle"
                      placeholder="Enter task title"
                      value={extractedParams.title || ""}
                      onChange={(e) => setExtractedParams({...extractedParams, title: e.target.value})}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="taskDescription">Description (optional)</Label>
                    <Textarea
                      id="taskDescription"
                      placeholder="Enter task description"
                      value={extractedParams.description || ""}
                      onChange={(e) => setExtractedParams({...extractedParams, description: e.target.value})}
                      className="w-full min-h-[80px]"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1.5">
                      <Label htmlFor="taskPriority">Priority</Label>
                      <Select 
                        value={extractedParams.priority || "medium"}
                        onValueChange={(value) => setExtractedParams({...extractedParams, priority: value})}
                      >
                        <SelectTrigger id="taskPriority">
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid gap-1.5">
                      <Label htmlFor="taskDueDate">Due Date</Label>
                      <input
                        type="date"
                        id="taskDueDate"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={extractedParams.dueDate ? new Date(extractedParams.dueDate).toISOString().split('T')[0] : ""}
                        onChange={(e) => setExtractedParams({...extractedParams, dueDate: e.target.value ? new Date(e.target.value) : null})}
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                  </div>
                </div>
              ) : contextType === 'assignee' ? (
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label>Assignee</Label>
                    <RadioGroup value={selectedOption || ""} onValueChange={setSelectedOption}>
                      <div className="grid gap-2 max-h-60 overflow-y-auto">
                        <div key="unassigned" className="flex items-center space-x-2">
                          <RadioGroupItem value="" id="unassigned" />
                          <Label htmlFor="unassigned" className="flex flex-col cursor-pointer">
                            <span className="font-medium">Unassigned</span>
                            <span className="text-sm text-muted-foreground">Leave task unassigned</span>
                          </Label>
                        </div>
                        {projectMembers.map((member) => (
                          <div key={member.userId} className="flex items-center space-x-2">
                            <RadioGroupItem value={member.userId} id={member.userId} />
                            <Label htmlFor={member.userId} className="flex flex-col cursor-pointer">
                              <div className="flex items-center">
                                <User className="h-4 w-4 mr-2" />
                                <span className="font-medium">{member.name}</span>
                              </div>
                            </Label>
                          </div>
                        ))}
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              ) : (
                <RadioGroup value={selectedOption || ""} onValueChange={setSelectedOption}>
                  <div className="grid gap-2 max-h-60 overflow-y-auto">
                    {contextOptions.map((option) => (
                      <div key={option.id} className="flex items-center space-x-2">
                        <RadioGroupItem value={option.id} id={option.id} />
                        <Label htmlFor={option.id} className="flex flex-col cursor-pointer">
                          <span className="font-medium">{option.name}</span>
                          {option.description && (
                            <span className="text-sm text-muted-foreground">{option.description}</span>
                          )}
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              )}
            </div>
            <DialogFooter>
              <Button 
                variant="secondary" 
                onClick={() => {
                  setShowContextDialog(false);
                  setContextOptions([]);
                  setSelectedOption(null);
                  setIsLoading(false);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleContextConfirm} disabled={contextType === 'project' ? !selectedOption || !extractedParams.title : !selectedOption && contextType !== 'dueDate'}>
                {contextType === 'project' ? 'Create Task' : 'Confirm'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Full Task Form Dialog */}
      <Dialog open={showTaskForm} onOpenChange={(open) => {
        // If closing the dialog, reset states
        if (!open) {
          setShowTaskForm(false);
          setFormInitialValues(null);
          setCommand("");
        }
      }}>
        <DialogContent className="sm:max-w-md md:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription>
              Complete the task details below. Fields marked with * are required.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {selectedProject && (
              <div className="mb-4 pb-2 border-b">
                <span className="text-sm font-semibold block">Project:</span>
                <span className="text-sm">{selectedProject.name}</span>
              </div>
            )}
            
            <TaskForm 
              projectId={selectedProject?.id || projectId || ""} 
              sprintId={extractedParams?.sprintId || sprintId}
              defaultValues={formInitialValues}
              onSuccess={handleTaskFormSuccess}
              projectName={selectedProject?.name}
            />
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Task Confirmation Dialog */}
      {showConfirmation && taskToCreate && (
        <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Task Created Successfully</DialogTitle>
              <DialogDescription>
                Your task has been created with the following details:
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2 py-4">
              <div className="flex flex-col space-y-1">
                <span className="font-semibold">Title:</span>
                <span>{taskToCreate.title}</span>
              </div>
              <div className="flex flex-col space-y-1">
                <span className="font-semibold">Project:</span>
                <span>{taskToCreate.projectName || taskToCreate.project?.name || 'Unknown Project'}</span>
              </div>
              {taskToCreate.description && (
                <div className="flex flex-col space-y-1">
                  <span className="font-semibold">Description:</span>
                  <span>{taskToCreate.description}</span>
                </div>
              )}
              <div className="flex flex-col space-y-1">
                <span className="font-semibold">Priority:</span>
                <span className="capitalize">{taskToCreate.priority}</span>
              </div>
              {taskToCreate.dueDate && (
                <div className="flex flex-col space-y-1">
                  <span className="font-semibold">Due Date:</span>
                  <span>{new Date(taskToCreate.dueDate).toLocaleDateString()}</span>
                </div>
              )}
              {taskToCreate.assignee && (
                <div className="flex flex-col space-y-1">
                  <span className="font-semibold">Assignee:</span>
                  <span>{`${taskToCreate.assignee.firstName} ${taskToCreate.assignee.lastName}`}</span>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button 
                variant="secondary" 
                onClick={() => setShowConfirmation(false)}
              >
                Close
              </Button>
              <Button
                onClick={handleTaskConfirm}
              >
                View Task
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

// Helper function to get badge variant based on priority
function getPriorityVariant(priority: string | undefined): "default" | "outline" | "secondary" | "destructive" {
  if (!priority) return "outline";
  
  switch (priority.toLowerCase()) {
    case "high":
    case "urgent":
      return "destructive";
    case "medium":
      return "secondary";
    case "low":
      return "outline";
    default:
      return "outline";
  }
}

/**
 * Extract project name from command
 */
function extractProjectNameFromCommand(command: string): string | null {
  const projectMatches = command.match(/in the ([^\s,\.]+(?:\s+[^\s,\.]+)*?) project/i) || 
                         command.match(/for the ([^\s,\.]+(?:\s+[^\s,\.]+)*?) project/i) ||
                         command.match(/for ([^\s,\.]+(?:\s+[^\s,\.]+)*?) project/i);
  
  if (projectMatches && projectMatches[1]) {
    return projectMatches[1].trim();
  }
  return null;
}

function formatContextTypeTitle(type: string): string {
  switch (type) {
    case 'project':
      return 'Project';
    case 'sprint':
      return 'Sprint';
    case 'assignee':
      return 'Assignee';
    case 'dueDate':
      return 'Due Date';
    default:
      return 'Option';
  }
} 