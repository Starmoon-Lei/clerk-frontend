"use client";

import { Button } from "../components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Upload, File, X, AlertTriangle } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { getClientTimeout, createTimeoutController } from "../../lib/config/timeouts";

// Data sanitization now happens server-side for security
// This prevents sensitive data from ever reaching the client

interface UploadedFile {
  id: string;
  file: File;
}

interface ProcessingResult {
  fileName: string;
  fileSize: number;
  success: boolean;
  documentType: string;
  confidence?: number;
  extractedData?: Record<string, unknown>;
  // openaiFileId removed for security - not exposed to client
  processingTimeMs: number;
  error?: string;
}

export function FileUpload() {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  // Task 1.1: Add processing state management
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingResults, setProcessingResults] = useState<ProcessingResult[]>([]);
  const [processingError, setProcessingError] = useState<string | null>(null);

  // Fix 2 & 9: Add abort controller for timeout and cancellation with proper cleanup
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // Fix 9: Track cleanup resources to prevent memory leaks
  const cleanupRef = useRef<(() => void) | null>(null);

  // Fix 9: Cleanup resources on component unmount
  useEffect(() => {
    return () => {
      // Clean up any pending operations on unmount
      if (abortController) {
        console.log('🧹 Cleaning up abort controller on unmount');
        abortController.abort();
      }

      // Clean up timeout or other resources
      if (cleanupRef.current) {
        console.log('🧹 Cleaning up resources on unmount');
        cleanupRef.current();
      }
    };
  }, [abortController]);

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
    const newFiles: UploadedFile[] = Array.from(files).map((file, index) => ({
      id: `file_${Date.now()}_${index}`,
      file
    }));

    // Task 3.4: Clear previous results when new files added
    setProcessingResults([]);
    setProcessingError(null);

    setUploadedFiles(prev => [...prev, ...newFiles]);
  };

  // Fix 2, 4 & 9: Updated function with consistent timeout and proper resource cleanup
  const sendFilesToOpenAI = async () => {
    // Cancel any existing request and cleanup previous resources
    if (abortController) {
      abortController.abort();
    }

    if (cleanupRef.current) {
      cleanupRef.current();
    }

    // Use centralized timeout configuration
    const uploadTimeout = getClientTimeout('UPLOAD');
    const { controller, cleanup } = createTimeoutController(uploadTimeout);
    setAbortController(controller);

    // Fix 9: Store cleanup function for proper resource management
    cleanupRef.current = cleanup;

    setIsProcessing(true);
    setProcessingError(null);

    try {
      const formData = new FormData();

      // Add all files to FormData
      uploadedFiles.forEach((uploadedFile) => {
        formData.append('files', uploadedFile.file);
      });

      const response = await fetch('/api/upload-files', {
        method: 'POST',
        body: formData,
        signal: controller.signal // Add abort signal
      });

      if (!response.ok) {
        throw new Error('Failed to upload files');
      }

      const result = await response.json();
      // CHANGE: Store results instead of console.log
      setProcessingResults(result.results);
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        setProcessingError('Request timed out or was cancelled. Please try again with fewer files.');
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        setProcessingError(errorMessage);
      }
    } finally {
      cleanup(); // Use centralized cleanup
      setIsProcessing(false);
      setAbortController(null);
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
        data-testid="file-drop-zone"
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
            <Button onClick={sendFilesToOpenAI} disabled={isProcessing} variant="default">
              {isProcessing ? 'Processing...' : 'Send to OpenAI'}
            </Button>
          </div>
          {/* Fix 2: Add progress bar with cancel option */}
          {isProcessing && (
            <div className="mt-2 space-y-2">
              <Progress value={50} />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Processing files... This may take several minutes.
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => abortController?.abort()}
                  className="ml-2"
                >
                  Cancel Upload
                </Button>
              </div>
            </div>
          )}
          <div className="space-y-2">
            {uploadedFiles.map((uploadedFile) => (
              <div key={uploadedFile.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg" data-testid="uploaded-file">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center">
                    <File className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm">{uploadedFile.file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(uploadedFile.file.size)}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(uploadedFile.id)}
                  className="h-8 w-8 p-0"
                  data-testid="remove-file-button"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Task 2.1: Create Results Display Section */}
      {processingResults.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Processing Results</CardTitle>
              {/* Task 3.1: Add JSON Export Button */}
              <Button
                onClick={() => {
                  const blob = new Blob([JSON.stringify(processingResults, null, 2)], {
                    type: 'application/json'
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `extracted-data-${new Date().toISOString().split('T')[0]}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="ml-auto"
              >
                Download JSON
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {processingResults.map(result => (
              <div key={result.fileName} className="mb-4 p-4 border rounded">
                <h4 className="font-semibold">{result.fileName}</h4>
                <Badge variant={result.success ? "default" : "destructive"}>
                  {result.documentType}
                </Badge>
                {result.confidence && (
                  <span className="ml-2 text-sm text-muted-foreground">
                    Confidence: {Math.round(result.confidence * 100)}%
                  </span>
                )}
                {/* Task 2.2: Add Extracted Data Preview - SANITIZED */}
                {result.extractedData && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm font-medium">
                      View Extracted Data (Sensitive data already sanitized server-side)
                    </summary>
                    <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                      {JSON.stringify(result.extractedData, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
            {/* Task 2.3: Handle Empty Results */}
            {processingResults.length === 0 && (
              <p className="text-muted-foreground">No processing results yet.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Task 3.2: Add Error Display with Retry */}
      {processingError && (
        <Alert variant="destructive" className="mt-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Processing Failed</AlertTitle>
          <AlertDescription>
            {processingError}
          </AlertDescription>
          <Button
            onClick={sendFilesToOpenAI}
            className="mt-2"
            variant="outline"
          >
            Try Again
          </Button>
        </Alert>
      )}
    </div>
  );
}