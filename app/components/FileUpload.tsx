"use client";

import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Upload, File, X } from "lucide-react";
import { useState } from "react";

interface UploadedFile {
  id: string;
  name: string;
  size: string;
  type: string;
  file: File; // Store the actual File object
}

export function FileUpload() {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFiles = (files: FileList) => {
    const newFiles: UploadedFile[] = Array.from(files).map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: formatFileSize(file.size),
      type: file.type,
      file: file // Store the actual File object
    }));
    
    setUploadedFiles(prev => [...prev, ...newFiles]);
  };

  // Function to send all uploaded files to OpenAI via API route
  const sendFilesToOpenAI = async () => {
    // Validation logic would go here

    try {
      const formData = new FormData();
      
      // Add all files to FormData
      uploadedFiles.forEach((uploadedFile) => {
        formData.append('files', uploadedFile.file);
      });

      const response = await fetch('/api/upload-files', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload files');
      }

      const result = await response.json();
      console.log('All files uploaded to OpenAI:', result.results);
      return result.results;
    } catch (error) {
      console.error('Error uploading files to OpenAI:', error);
      throw error;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const removeFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== id));
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h1 className="mb-2">Upload Your Files</h1>
        <p className="text-muted-foreground">
          Drag and drop your files here or click to browse
        </p>
      </div>

      <Card 
        className={`p-8 border-2 border-dashed transition-colors ${
          dragActive 
            ? 'border-primary bg-primary/5' 
            : 'border-muted-foreground/25 hover:border-muted-foreground/50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center">
            <Upload className="w-6 h-6 text-muted-foreground" />
          </div>
          
          <div className="space-y-2">
            <p>Drop files to upload</p>
            <p className="text-sm text-muted-foreground">
              or click to browse from your computer
            </p>
          </div>
          
          <Button 
            variant="outline" 
            onClick={() => document.getElementById('file-input')?.click()}
          >
            Browse Files
          </Button>
          
          <input
            id="file-input"
            type="file"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
        </div>
      </Card>

      {uploadedFiles.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3>Uploaded Files</h3>
            <Button onClick={sendFilesToOpenAI} variant="default">
              Send to OpenAI
            </Button>
          </div>
          <div className="space-y-2">
            {uploadedFiles.map((file) => (
              <div key={file.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center">
                    <File className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{file.size}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(file.id)}
                  className="h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}