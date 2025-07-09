"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { Briefcase, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { createPortal } from "react-dom";

type CreateWorkspaceModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (workspace: { name: string; description: string }) => void;
};

export default function CreateWorkspaceModal({ isOpen, onClose, onCreate }: CreateWorkspaceModalProps) {
  const { user } = useUser();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // Set up portal mounting
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);
  
  // Prevent scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !mounted) {
    return null;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onCreate(formData);
      setFormData({ name: "", description: "" });
    } catch (error) {
      console.error("Error creating workspace:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <div 
      className="fixed inset-0 z-[9999] overflow-hidden"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      
      {/* Modal Centering Container */}
      <div 
        className="fixed inset-0 flex items-center justify-center p-4"
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        {/* Modal */}
        <div 
          className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl animate-scaleIn w-full max-w-lg max-h-[80vh] overflow-auto"
          onClick={e => e.stopPropagation()}
          style={{ maxHeight: '80vh', width: '100%', maxWidth: '32rem', margin: 'auto' }}
        >
          {/* Close Button */}
          <div className="absolute top-4 right-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              className="h-8 w-8 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Modal Content */}
          <div className="px-6 pt-8 pb-8">
            <div className="flex flex-col items-center mb-6">
              <div className="h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-4 animate-pulse-soft">
                <Briefcase className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="text-xl font-medium text-gray-900 dark:text-white">Create New Workspace</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 text-center">
                A workspace is where you and your team can collaborate on projects.
              </p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="name">
                  Workspace Name
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="My Team Workspace"
                  className="w-full"
                  autoFocus
                />
              </div>
              
              <div className="space-y-1.5">
                <Label htmlFor="description">
                  Description
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Describe the purpose of this workspace"
                  className="resize-none"
                />
              </div>
              
              <div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse">
                <Button
                  type="submit"
                  disabled={isSubmitting || !formData.name.trim()}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-md w-full sm:w-auto"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : "Create Workspace"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );

  // Render using portal to ensure it's at the document root level
  return createPortal(modalContent, document.body);
} 