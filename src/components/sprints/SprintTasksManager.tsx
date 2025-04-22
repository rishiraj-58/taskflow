import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
  DialogFooter
} from "@/components/ui/dialog";
import { Check, Clock, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Task } from "@/types";
import axios from "axios";
import { Spinner } from "@/components/ui/spinner";

interface SprintTasksManagerProps {
  projectId: string;
  sprintId: string;
}

export function SprintTasksManager({ projectId, sprintId }: SprintTasksManagerProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({
    totalTasks: 0,
    completedTasks: 0,
    progressPercentage: 0,
    tasksByStatus: {
      todo: 0,
      "in-progress": 0,
      review: 0,
      done: 0
    }
  });
  const [addingTasks, setAddingTasks] = useState(false);
  const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [removingTask, setRemovingTask] = useState<string | null>(null);
  
  const { toast } = useToast();

  // Fetch tasks in this sprint
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/projects/${projectId}/sprints/${sprintId}/tasks`);
        setTasks(response.data.tasks);
        setProgress({
          totalTasks: response.data.totalTasks,
          completedTasks: response.data.completedTasks,
          progressPercentage: response.data.progressPercentage,
          tasksByStatus: response.data.tasksByStatus
        });
        setError(null);
      } catch (err) {
        console.error("Error fetching sprint tasks:", err);
        setError("Failed to load sprint tasks. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [projectId, sprintId]);

  // Fetch available tasks (not in any sprint)
  const fetchAvailableTasks = async () => {
    try {
      const response = await axios.get(`/api/projects/${projectId}/tasks?filter=nosprint`);
      setAvailableTasks(response.data);
    } catch (err) {
      console.error("Error fetching available tasks:", err);
      toast({
        title: "Error",
        description: "Failed to load available tasks",
      });
    }
  };

  // Handle add tasks to sprint
  const handleAddTasks = async () => {
    if (selectedTaskIds.length === 0) {
      toast({
        title: "No tasks selected",
        description: "Please select at least one task to add to the sprint",
      });
      return;
    }

    try {
      await axios.post(`/api/projects/${projectId}/sprints/${sprintId}/tasks`, {
        taskIds: selectedTaskIds
      });
      
      // Refresh tasks
      const response = await axios.get(`/api/projects/${projectId}/sprints/${sprintId}/tasks`);
      setTasks(response.data.tasks);
      setProgress({
        totalTasks: response.data.totalTasks,
        completedTasks: response.data.completedTasks,
        progressPercentage: response.data.progressPercentage,
        tasksByStatus: response.data.tasksByStatus
      });
      
      // Reset selection state
      setSelectedTaskIds([]);
      setAddingTasks(false);
      
      toast({
        title: "Tasks added",
        description: `Added ${selectedTaskIds.length} tasks to the sprint`,
      });
    } catch (err) {
      console.error("Error adding tasks to sprint:", err);
      toast({
        title: "Error",
        description: "Failed to add tasks to sprint",
      });
    }
  };

  // Handle remove task from sprint
  const handleRemoveTask = async (taskId: string) => {
    try {
      await axios.delete(`/api/projects/${projectId}/sprints/${sprintId}/tasks`, {
        data: {
          taskIds: [taskId]
        }
      });
      
      // Refresh tasks
      const response = await axios.get(`/api/projects/${projectId}/sprints/${sprintId}/tasks`);
      setTasks(response.data.tasks);
      setProgress({
        totalTasks: response.data.totalTasks,
        completedTasks: response.data.completedTasks,
        progressPercentage: response.data.progressPercentage,
        tasksByStatus: response.data.tasksByStatus
      });
      
      setRemovingTask(null);
      
      toast({
        title: "Task removed",
        description: "Task removed from sprint",
      });
    } catch (err) {
      console.error("Error removing task from sprint:", err);
      toast({
        title: "Error",
        description: "Failed to remove task from sprint",
      });
    }
  };

  // Status mapping for display
  const statusMap: Record<string, { label: string, color: string }> = {
    "todo": { label: "To Do", color: "bg-slate-500" },
    "in-progress": { label: "In Progress", color: "bg-blue-500" },
    "review": { label: "In Review", color: "bg-amber-500" },
    "done": { label: "Done", color: "bg-green-500" }
  };

  // Priority mapping for display
  const priorityMap: Record<string, { label: string, color: string }> = {
    "low": { label: "Low", color: "bg-slate-500" },
    "medium": { label: "Medium", color: "bg-amber-500" },
    "high": { label: "High", color: "bg-red-500" }
  };

  // Toggle task selection
  const toggleTaskSelection = (taskId: string) => {
    setSelectedTaskIds(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId) 
        : [...prev, taskId]
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-red-300 bg-red-50 rounded-md">
        <p className="text-red-500">{error}</p>
        <Button 
          variant="outline" 
          size="sm" 
          className="mt-2"
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Sprint Tasks</h3>
          <p className="text-sm text-muted-foreground">
            {progress.totalTasks} tasks ({progress.completedTasks} completed)
          </p>
        </div>
        
        <Dialog open={addingTasks} onOpenChange={setAddingTasks}>
          <DialogTrigger asChild>
            <Button 
              size="sm" 
              className="flex items-center gap-1"
              onClick={() => {
                fetchAvailableTasks();
                setAddingTasks(true);
              }}
            >
              <Plus size={16} />
              <span>Add Tasks</span>
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Tasks to Sprint</DialogTitle>
              <DialogDescription>
                Select tasks to add to this sprint
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              {availableTasks.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No available tasks found. All tasks are already assigned to sprints.
                </p>
              ) : (
                <div className="space-y-2">
                  {availableTasks.map(task => (
                    <div 
                      key={task.id}
                      className={`p-4 border rounded-md cursor-pointer flex justify-between items-center ${
                        selectedTaskIds.includes(task.id) ? 'border-primary bg-primary/10' : 'border-border'
                      }`}
                      onClick={() => toggleTaskSelection(task.id)}
                    >
                      <div>
                        <h4 className="font-medium">{task.title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={statusMap[task.status]?.color || "bg-slate-500"}>
                            {statusMap[task.status]?.label || task.status}
                          </Badge>
                          <Badge className={priorityMap[task.priority]?.color || "bg-slate-500"}>
                            {priorityMap[task.priority]?.label || task.priority}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {selectedTaskIds.includes(task.id) && <Check className="text-primary" />}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddingTasks(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddTasks} disabled={selectedTaskIds.length === 0}>
                Add Selected Tasks
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className="bg-primary h-2.5 rounded-full" 
            style={{ width: `${progress.progressPercentage}%` }}
          ></div>
        </div>
        <span className="text-sm font-medium">{progress.progressPercentage}%</span>
      </div>
      
      <div className="grid grid-cols-4 gap-4 text-center text-sm">
        <div className="p-2 bg-secondary/50 rounded-md">
          <div className="font-medium">To Do</div>
          <div className="text-lg">{progress.tasksByStatus.todo}</div>
        </div>
        <div className="p-2 bg-secondary/50 rounded-md">
          <div className="font-medium">In Progress</div>
          <div className="text-lg">{progress.tasksByStatus["in-progress"]}</div>
        </div>
        <div className="p-2 bg-secondary/50 rounded-md">
          <div className="font-medium">In Review</div>
          <div className="text-lg">{progress.tasksByStatus.review}</div>
        </div>
        <div className="p-2 bg-secondary/50 rounded-md">
          <div className="font-medium">Done</div>
          <div className="text-lg">{progress.tasksByStatus.done}</div>
        </div>
      </div>
      
      <Separator />
      
      {tasks.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-md">
          <p className="text-muted-foreground">No tasks in this sprint yet</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2"
            onClick={() => {
              fetchAvailableTasks();
              setAddingTasks(true);
            }}
          >
            <Plus size={16} className="mr-1" />
            Add Tasks
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map(task => (
            <Card key={task.id} className="p-4">
              <div className="flex justify-between">
                <div>
                  <h4 className="font-medium">{task.title}</h4>
                  <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                    {task.description || "No description"}
                  </p>
                  
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className={statusMap[task.status]?.color || "bg-slate-500"}>
                      {statusMap[task.status]?.label || task.status}
                    </Badge>
                    <Badge className={priorityMap[task.priority]?.color || "bg-slate-500"}>
                      {priorityMap[task.priority]?.label || task.priority}
                    </Badge>
                    {task.dueDate && (
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Clock size={12} className="mr-1" />
                        {new Date(task.dueDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
                
                <Dialog
                  open={removingTask === task.id}
                  onOpenChange={(open) => {
                    if (!open) setRemovingTask(null);
                    else setRemovingTask(task.id);
                  }}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </DialogTrigger>
                  
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Remove Task from Sprint</DialogTitle>
                      <DialogDescription>
                        Are you sure you want to remove this task from the sprint?
                        The task will still exist in the project.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <DialogFooter>
                      <Button 
                        variant="outline" 
                        onClick={() => setRemovingTask(null)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        variant="destructive"
                        onClick={() => handleRemoveTask(task.id)}
                      >
                        Remove
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 