"use client";
import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import {
  Upload,
  FileText,
  X,
  CheckCircle,
  AlertTriangle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { Button } from "../components/button";
import { Card } from "../components/card";
import { toast } from "../hooks/use-toast";

interface UploadedFile {
  file: File;
  id: string;
  status: "ready" | "uploading" | "success" | "error";
  progress: number;
  fileUrl?: string;
}

export default function UploadPage() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  // Handle file drop
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      status: "ready" as const,
      progress: 0,
    }));

    setUploadedFiles((prev) => [...prev, ...newFiles]);

    if (acceptedFiles.length > 0) {
      toast({
        title: "Files added successfully",
        description: `${acceptedFiles.length} PDF file(s) ready for analysis`,
      });
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxSize: 10 * 1024 * 1024,
    onDropRejected: (rejectedFiles) => {
      rejectedFiles.forEach(({ errors }) => {
        errors.forEach((error) => {
          if (error.code === "file-too-large") {
            toast({
              title: "File too large",
              description: "Please select files smaller than 10MB",
              variant: "destructive",
            });
          } else if (error.code === "file-invalid-type") {
            toast({
              title: "Invalid file type",
              description: "Please select PDF files only",
              variant: "destructive",
            });
          }
        });
      });
    },
  });

  // Remove file from list
  const removeFile = (id: string) => {
    setUploadedFiles((prev) => prev.filter((file) => file.id !== id));
  };

  // Handle submit (upload to Supabase via API route)
  const handleSubmit = async () => {
    if (uploadedFiles.length === 0) {
      toast({
        title: "No files selected",
        description: "Please upload at least one PDF file",
        variant: "destructive",
      });
      return;
    }

    setUploadedFiles((prev) =>
      prev.map((file) => ({ ...file, status: "uploading", progress: 0 }))
    );

    for (const file of uploadedFiles) {
      try {
        const formData = new FormData();
        formData.append("file", file.file);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) throw new Error("Upload failed");

        const data = await response.json();

        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.id === file.id
              ? { ...f, status: "success", progress: 100, fileUrl: data.publicUrl }
              : f
          )
        );
      } catch (error) {
        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.id === file.id ? { ...f, status: "error", progress: 0 } : f
          )
        );
        toast({
          title: "Upload failed",
          description: `Error uploading ${file.file.name}`,
          variant: "destructive",
        });
      }
    }

    if (uploadedFiles.every((f) => f.status === "success")) {
      toast({
        title: "Upload complete!",
        description: "Your legal documents have been uploaded successfully",
      });
    }
  };

  // File size formatter
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <section className="py-20 bg-gradient-to-b from-background to-legal-navy-light/20">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
            Upload Your Legal Documents
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Drag & drop PDF files or click to select them. Our AI will analyze
            them instantly and provide insights.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <Card className="p-8 shadow-elegant">
            {/* Upload Area */}
            <div
              {...getRootProps()}
              className={`relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
                transition-all duration-300 ease-smooth
                ${
                  isDragActive
                    ? "border-legal-navy bg-gradient-upload scale-105 shadow-glow"
                    : "border-border hover:border-legal-navy hover:bg-gradient-upload"
                }`}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center gap-4">
                <div
                  className={`p-4 rounded-full transition-all duration-300
                    ${
                      isDragActive
                        ? "bg-legal-navy text-white scale-110"
                        : "bg-legal-navy-light text-legal-navy"
                    }`}
                >
                  <Upload className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-semibold mb-2">
                    {isDragActive ? "Drop your files here" : "Upload PDF Documents"}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Drag & drop your legal documents here, or click to browse
                  </p>
                  <Button variant="outline" size="lg" className="mb-4">
                    Choose Files
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    Supports PDF files up to 10MB each
                  </p>
                </div>
              </div>
            </div>

            {/* File List */}
            {uploadedFiles.length > 0 && (
              <div className="mt-8 space-y-4">
                <h4 className="text-lg font-semibold">
                  Uploaded Documents ({uploadedFiles.length})
                </h4>
                {uploadedFiles.map(({ file, id, status, progress, fileUrl }) => (
                  <div
                    key={id}
                    className="flex items-center gap-4 p-4 bg-muted rounded-lg"
                  >
                    <div className="flex-shrink-0">
                      <FileText className="h-8 w-8 text-legal-navy" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        {fileUrl ? (
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium truncate text-legal-navy hover:underline flex items-center gap-1"
                          >
                            {file.name}
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        ) : (
                          <span className="font-medium truncate text-legal-navy">
                            {file.name}
                          </span>
                        )}
                        <span className="text-sm text-muted-foreground">
                          {formatFileSize(file.size)}
                        </span>
                      </div>
                      {status === "uploading" && (
                        <div className="w-full bg-border rounded-full h-2">
                          <div
                            className="bg-legal-navy h-2 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {status === "ready" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                      {status === "uploading" && (
                        <Loader2 className="h-5 w-5 animate-spin text-legal-navy" />
                      )}
                      {status === "success" && (
                        <CheckCircle className="h-5 w-5 text-success-green" />
                      )}
                      {status === "error" && (
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                      )}
                    </div>
                  </div>
                ))}
                <div className="flex justify-center pt-4">
                  <Button
                    size="lg"
                    onClick={handleSubmit}
                    disabled={
                      uploadedFiles.length === 0 ||
                      uploadedFiles.some((f) => f.status === "uploading")
                    }
                    className="min-w-48"
                  >
                    {uploadedFiles.some((f) => f.status === "uploading") ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        Upload to Cloud
                        <FileText className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </section>
  );
}
