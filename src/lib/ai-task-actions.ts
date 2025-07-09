import { toast } from "sonner";
import axios from "axios";

interface AIAction {
  type: string;
  parameters: Record<string, any>;
  description: string;
}

/**
 * Executes an AI-parsed task action
 */
export async function executeTaskAction(action: AIAction, projectId: string): Promise<boolean> {
  try {
    switch (action.type) {
      case "CREATE_TASK":
        return await createTask(action, projectId);
      
      case "UPDATE_TASK":
        return await updateTask(action, projectId);
      
      case "MOVE_TASK":
        return await moveTaskToSprint(action, projectId);
      
      case "GENERATE_SUBTASKS":
        return await generateSubtasks(action, projectId);
      
      default:
        toast.error(`Unsupported action type: ${action.type}`);
        return false;
    }
  } catch (error) {
    console.error("Error executing task action:", error);
    toast.error("Failed to execute the requested action");
    return false;
  }
}

/**
 * Creates a new task based on AI-parsed parameters
 */
async function createTask(action: AIAction, projectId: string): Promise<boolean> {
  const { title, description, priority, dueDate, assignee, taskType = "task" } = action.parameters;
  
  if (!title) {
    toast.error("Task title is required");
    return false;
  }
  
  try {
    const response = await axios.post(`/api/projects/${projectId}/tasks`, {
      title,
      description: description || "",
      priority: priority || "medium",
      dueDate: dueDate || null,
      assigneeId: assignee || null,
      status: "todo",
      type: taskType
    });
    
    if (response.status === 200 || response.status === 201) {
      toast.success("Task created successfully");
      return true;
    } else {
      toast.error("Failed to create task");
      return false;
    }
  } catch (error) {
    console.error("Error creating task:", error);
    toast.error("Failed to create task");
    return false;
  }
}

/**
 * Updates an existing task based on AI-parsed parameters
 */
async function updateTask(action: AIAction, projectId: string): Promise<boolean> {
  const { taskId, title, description, priority, dueDate, assignee, status } = action.parameters;
  
  if (!taskId) {
    toast.error("Task ID is required for updates");
    return false;
  }
  
  try {
    // Build update object with only the fields that are provided
    const updateData: Record<string, any> = {};
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (priority) updateData.priority = priority;
    if (dueDate !== undefined) updateData.dueDate = dueDate;
    if (assignee !== undefined) updateData.assigneeId = assignee;
    if (status) updateData.status = status;
    
    const response = await axios.patch(`/api/projects/${projectId}/tasks/${taskId}`, updateData);
    
    if (response.status === 200) {
      toast.success("Task updated successfully");
      return true;
    } else {
      toast.error("Failed to update task");
      return false;
    }
  } catch (error) {
    console.error("Error updating task:", error);
    toast.error("Failed to update task");
    return false;
  }
}

/**
 * Moves a task to a specified sprint
 */
async function moveTaskToSprint(action: AIAction, projectId: string): Promise<boolean> {
  const { taskId, targetSprint } = action.parameters;
  
  if (!taskId || !targetSprint) {
    toast.error("Task ID and target sprint are required");
    return false;
  }
  
  try {
    // First, get the sprint ID from the sprint name
    const sprintsResponse = await axios.get(`/api/projects/${projectId}/sprints`);
    const sprints = sprintsResponse.data;
    
    const targetSprintObj = sprints.find((sprint: any) => 
      sprint.name.toLowerCase() === targetSprint.toLowerCase()
    );
    
    if (!targetSprintObj) {
      toast.error(`Sprint "${targetSprint}" not found`);
      return false;
    }
    
    // Now update the task with the sprint ID
    const response = await axios.patch(`/api/projects/${projectId}/tasks/${taskId}`, {
      sprintId: targetSprintObj.id
    });
    
    if (response.status === 200) {
      toast.success(`Task moved to sprint "${targetSprint}"`);
      return true;
    } else {
      toast.error("Failed to move task to sprint");
      return false;
    }
  } catch (error) {
    console.error("Error moving task to sprint:", error);
    toast.error("Failed to move task to sprint");
    return false;
  }
}

/**
 * Generates subtasks for a parent task
 */
async function generateSubtasks(action: AIAction, projectId: string): Promise<boolean> {
  const { sourceTaskId, count = 1, subtasks } = action.parameters;
  
  if (!sourceTaskId) {
    toast.error("Source task ID is required for generating subtasks");
    return false;
  }
  
  try {
    // If AI provided specific subtasks, use those
    if (Array.isArray(subtasks) && subtasks.length > 0) {
      let successCount = 0;
      
      // Create each subtask
      for (const subtask of subtasks) {
        const response = await axios.post(`/api/projects/${projectId}/tasks`, {
          title: subtask.title || "Subtask",
          description: subtask.description || "",
          priority: subtask.priority || "medium",
          dueDate: subtask.dueDate || null,
          assigneeId: subtask.assignee || null,
          status: "todo",
          parentTaskId: sourceTaskId
        });
        
        if (response.status === 200 || response.status === 201) {
          successCount++;
        }
      }
      
      if (successCount > 0) {
        toast.success(`Created ${successCount} subtasks`);
        return true;
      } else {
        toast.error("Failed to create subtasks");
        return false;
      }
    } else {
      // Create generic subtasks based on count
      let successCount = 0;
      
      // Get the parent task to use its info for naming subtasks
      const parentResponse = await axios.get(`/api/projects/${projectId}/tasks/${sourceTaskId}`);
      const parentTask = parentResponse.data;
      
      for (let i = 1; i <= count; i++) {
        const response = await axios.post(`/api/projects/${projectId}/tasks`, {
          title: `${parentTask.title} - Subtask ${i}`,
          description: "",
          priority: parentTask.priority || "medium",
          dueDate: null,
          assigneeId: null,
          status: "todo",
          parentTaskId: sourceTaskId
        });
        
        if (response.status === 200 || response.status === 201) {
          successCount++;
        }
      }
      
      if (successCount > 0) {
        toast.success(`Created ${successCount} subtasks`);
        return true;
      } else {
        toast.error("Failed to create subtasks");
        return false;
      }
    }
  } catch (error) {
    console.error("Error generating subtasks:", error);
    toast.error("Failed to generate subtasks");
    return false;
  }
} 