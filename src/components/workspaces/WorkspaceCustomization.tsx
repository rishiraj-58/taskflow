"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

interface WorkspaceCustomizationProps {
  workspace: {
    id: string;
    name: string;
    logoUrl: string | null;
    themeColor: string;
  };
}

export default function WorkspaceCustomization({ workspace }: WorkspaceCustomizationProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [themeColor, setThemeColor] = useState(workspace.themeColor || "#7c3aed");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(workspace.logoUrl);
  const [removeLogo, setRemoveLogo] = useState(false);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Check file type
      if (!["image/jpeg", "image/png", "image/svg+xml"].includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload a JPEG, PNG, or SVG file.",
          variant: "destructive",
        });
        return;
      }
      
      // Check file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Maximum file size is 5MB.",
          variant: "destructive",
        });
        return;
      }
      
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
      setRemoveLogo(false);
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setRemoveLogo(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("themeColor", themeColor);
      
      if (logoFile) {
        formData.append("logo", logoFile);
      }
      
      formData.append("removeLogo", removeLogo.toString());

      const response = await fetch(`/api/workspaces/${workspace.id}/customize`, {
        method: "PUT",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update workspace customization");
      }

      const data = await response.json();
      
      toast({
        title: "Success",
        description: "Workspace customization updated successfully",
      });
      
      // Refresh the page to show updated settings
      router.refresh();
    } catch (error) {
      console.error("Error updating workspace:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update workspace customization",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Workspace Appearance</h3>
        <p className="text-sm text-muted-foreground">
          Customize how your workspace looks with a logo and theme color.
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="themeColor">Theme Color</Label>
            <div className="flex items-center gap-3 mt-1.5">
              <Input
                type="color"
                id="themeColor"
                value={themeColor}
                onChange={(e) => setThemeColor(e.target.value)}
                className="w-12 h-10 p-1 cursor-pointer"
              />
              <Input
                type="text"
                value={themeColor}
                onChange={(e) => setThemeColor(e.target.value)}
                placeholder="#7c3aed"
                className="w-32"
                pattern="^#[0-9A-Fa-f]{6}$"
                title="Please enter a valid hex color code (e.g., #7c3aed)"
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              This color will be used for the workspace accent color.
            </p>
          </div>

          <div>
            <Label htmlFor="logo">Workspace Logo</Label>
            <div className="mt-1.5 space-y-3">
              {logoPreview ? (
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16 overflow-hidden border rounded-md">
                    <Image
                      src={logoPreview}
                      alt="Workspace logo preview"
                      fill
                      className="object-contain"
                    />
                  </div>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={handleRemoveLogo}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove Logo
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-center w-full">
                  <label
                    htmlFor="logo-upload"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-md cursor-pointer bg-muted/50 hover:bg-muted"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                      <p className="mb-1 text-sm text-muted-foreground">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground">
                        SVG, PNG, JPG (max. 5MB)
                      </p>
                    </div>
                    <Input
                      id="logo-upload"
                      type="file"
                      accept="image/jpeg,image/png,image/svg+xml"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>

        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : "Save Changes"}
        </Button>
      </form>
    </div>
  );
} 