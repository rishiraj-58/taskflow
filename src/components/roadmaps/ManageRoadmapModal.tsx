import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface Roadmap {
  id: string;
  name: string;
  description: string | null;
  startDate: string | Date;
  endDate: string | Date;
  projectId: string;
}

interface ManageRoadmapModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roadmapId: string;
  projectId: string;
  onRoadmapUpdated: () => void;
}

export function ManageRoadmapModal({
  open,
  onOpenChange,
  roadmapId,
  projectId,
  onRoadmapUpdated,
}: ManageRoadmapModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Roadmap>({
    id: roadmapId,
    name: "",
    description: "",
    startDate: new Date(),
    endDate: new Date(new Date().setMonth(new Date().getMonth() + 3)),
    projectId: projectId,
  });

  useEffect(() => {
    if (open && roadmapId) {
      fetchRoadmapDetails();
    }
  }, [open, roadmapId]);

  const fetchRoadmapDetails = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/roadmaps/${roadmapId}`);

      if (!response.ok) {
        throw new Error("Failed to fetch roadmap details");
      }

      const data = await response.json();
      setFormData({
        ...data,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
      });
    } catch (error) {
      console.error("Error fetching roadmap:", error);
      setError(
        error instanceof Error ? error.message : "Failed to load roadmap details"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleDateChange = (
    date: Date | undefined,
    field: "startDate" | "endDate"
  ) => {
    if (date) {
      setFormData({
        ...formData,
        [field]: date,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/roadmaps/${roadmapId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          startDate: formData.startDate,
          endDate: formData.endDate,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update roadmap");
      }

      toast({
        title: "Roadmap updated",
        description: "Roadmap details have been successfully updated",
      });

      onRoadmapUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating roadmap:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to update roadmap",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this roadmap? This action cannot be undone.")) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/roadmaps/${roadmapId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete roadmap");
      }

      toast({
        title: "Roadmap deleted",
        description: "Roadmap has been successfully deleted",
      });

      onRoadmapUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting roadmap:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to delete roadmap",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[550px]">
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            <span className="ml-2">Loading roadmap details...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[550px]">
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <AlertTriangle className="h-10 w-10 text-red-500 mb-2" />
            <h3 className="text-lg font-medium">Error Loading Roadmap</h3>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Manage Roadmap</DialogTitle>
            <DialogDescription>
              Update your roadmap details or delete this roadmap
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Roadmap Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g., Q3 2023 Product Roadmap"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Provide a description for this roadmap"
                value={formData.description || ""}
                onChange={handleInputChange}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.startDate instanceof Date
                        ? format(formData.startDate, "PPP")
                        : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={
                        formData.startDate instanceof Date
                          ? formData.startDate
                          : new Date(formData.startDate)
                      }
                      onSelect={(date) => handleDateChange(date, "startDate")}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid gap-2">
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.endDate instanceof Date
                        ? format(formData.endDate, "PPP")
                        : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={
                        formData.endDate instanceof Date
                          ? formData.endDate
                          : new Date(formData.endDate)
                      }
                      onSelect={(date) => handleDateChange(date, "endDate")}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          <DialogFooter className="flex justify-between">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              Delete Roadmap
            </Button>
            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 