import { generateDownloadUrl } from "@/lib/s3";

/**
 * Checks if a fileUrl is an S3 key (no http/https) and returns a download URL if needed
 */
export async function getDocumentUrl(fileUrl: string | null): Promise<string | null> {
  if (!fileUrl) {
    console.log("getDocumentUrl: fileUrl is null/undefined");
    return null;
  }
  
  // Handle empty strings
  if (fileUrl.trim() === "") {
    console.log("getDocumentUrl: fileUrl is empty string");
    return null;
  }
  
  console.log("getDocumentUrl processing:", JSON.stringify(fileUrl));
  
  // If it's already a URL (starts with http/https), return it as-is
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
    console.log("Returning existing URL (starts with http/https)");
    return fileUrl;
  }
  
  // Otherwise assume it's an S3 key and generate a download URL
  try {
    console.log("Generating S3 download URL for key:", JSON.stringify(fileUrl));
    const downloadUrl = await generateDownloadUrl(fileUrl);
    if (downloadUrl) {
      console.log("Generated S3 URL successfully:", downloadUrl.substring(0, 40) + "...");
      return downloadUrl;
    } else {
      console.error("S3 URL generation returned null/undefined");
      return null;
    }
  } catch (error) {
    console.error('Error generating download URL:', error);
    // Return a fallback URL that indicates the error
    return null;
  }
}

/**
 * Get document type based on filename or extension
 */
export function getDocumentType(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  
  // Document types
  const documentTypes: { [key: string]: string } = {
    'pdf': 'PDF Document',
    'doc': 'Word Document',
    'docx': 'Word Document',
    'xls': 'Excel Spreadsheet',
    'xlsx': 'Excel Spreadsheet',
    'ppt': 'PowerPoint Presentation',
    'pptx': 'PowerPoint Presentation',
    'txt': 'Text Document',
    'csv': 'CSV File',
    'jpg': 'Image',
    'jpeg': 'Image',
    'png': 'Image',
    'gif': 'Image',
    'mp4': 'Video',
    'mp3': 'Audio',
    'zip': 'Archive',
    'rar': 'Archive',
  };
  
  return documentTypes[extension] || 'File';
}

/**
 * Get file icon name based on file type
 */
export function getFileIconName(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  
  // Basic mapping of extensions to icon names
  const iconMap: { [key: string]: string } = {
    'pdf': 'file-pdf',
    'doc': 'file-text',
    'docx': 'file-text',
    'xls': 'file-spreadsheet',
    'xlsx': 'file-spreadsheet',
    'ppt': 'file-presentation',
    'pptx': 'file-presentation',
    'txt': 'file-text',
    'csv': 'file-spreadsheet',
    'jpg': 'file-image',
    'jpeg': 'file-image',
    'png': 'file-image',
    'gif': 'file-image',
    'mp4': 'file-video',
    'mp3': 'file-audio',
    'zip': 'file-archive',
    'rar': 'file-archive',
  };
  
  return iconMap[extension] || 'file';
} 