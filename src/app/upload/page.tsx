"use client";
import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import ReactConfetti from 'react-confetti';

import { useToast } from "../hooks/use-toast";

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
import { useRouter } from "next/navigation";

interface UploadedFile {
  file: File;
  id: string;
  status: "ready" | "uploading" | "success" | "error";
  progress: number;
  fileUrl?: string;
  previewUrl?: string;
}

export default function UploadPage() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const router = useRouter();

  const onDrop = useCallback((files: File[]) => {
    // Show confetti on a successful drop
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 2000); // Hide confetti after 2 seconds

    const newFiles = files.map((file) => ({
      file,
      id: Math.random().toString(36).substring(2, 9),
      status: "ready" as const,
      progress: 0,
      previewUrl: URL.createObjectURL(file),
    }));
    setUploadedFiles((prev) => [...prev, ...newFiles]);
    if (files.length > 0) {
      toast({
        title: "Files ready",
        description: `${files.length} PDF file(s) ready for analysis`,
      });
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxSize: 10 * 1024 * 1024,
    onDropRejected: (rejected) => {
      rejected.forEach((r) =>
        r.errors.forEach((e) => {
          toast({
            title: e.code === "file-too-large" ? "File too large" : "Invalid file type",
            description:
              e.code === "file-too-large"
                ? "Please select files smaller than 10MB"
                : "Please select PDF files only",
            variant: "destructive",
          });
        })
      );
    },
  });

  const removeFile = (id: string) => {
    setUploadedFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file?.previewUrl) URL.revokeObjectURL(file.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  };

  const handleSubmit = async () => {
    if (!uploadedFiles.length) {
      toast({ title: "No files selected", description: "Upload at least one PDF", variant: "destructive" });
      return;
    }

    let lastFileUrl = "";
    setUploadedFiles((prev) =>
      prev.map((f) => ({ ...f, status: "uploading", progress: 50 }))
    );

    for (const file of uploadedFiles) {
      try {
        const formData = new FormData();
        formData.append("file", file.file);

        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
        const data = await res.json();

        lastFileUrl = data.publicUrl;

        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.id === file.id ? { ...f, status: "success", progress: 100, fileUrl: lastFileUrl } : f
          )
        );
      } catch (err: any) {
        console.error(err);
        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.id === file.id ? { ...f, status: "error", progress: 0 } : f
          )
        );
        toast({ title: "Upload failed", description: `Error uploading ${file.file.name}`, variant: "destructive" });
      }
    }

    if (lastFileUrl) {
      toast({ title: "Upload complete", description: "Redirecting to analysis page..." });
      router.push(`/analyze?fileUrl=${encodeURIComponent(lastFileUrl)}`);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <section className="py-20 bg-gradient-to-b from-background to-legal-navy-light/20">
      {showConfetti && <ReactConfetti className="z-50" />}
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">Upload Your Legal Documents</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Drag & drop PDF files or click to select. AI will analyze them instantly.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <Card className="p-8 shadow-elegant">
            <div
              {...getRootProps()}
              className={`relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-300 ${
                isDragActive
                  ? "border-legal-navy bg-legal-navy-light/50 scale-105 shadow-glow"
                  : "border-border hover:border-legal-navy hover:bg-legal-navy-light/10"
              }`}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center gap-4">
                {isDragActive && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="absolute inset-0 flex items-center justify-center bg-legal-navy/10 backdrop-blur-sm rounded-xl z-10"
                  >
                    <FileText className="h-24 w-24 text-legal-navy opacity-30" />
                  </motion.div>
                )}
                <div className={`p-4 rounded-full transition-all duration-300 ${isDragActive ? "bg-legal-navy text-white scale-110" : "bg-legal-navy-light text-legal-navy"}`}>
                  <Upload className="h-8 w-8" />
                </div>
                <h3 className="text-2xl font-semibold mb-2">{isDragActive ? "Drop the files here..." : "Upload PDF Documents"}</h3>
                <p className="text-muted-foreground mb-4">Drag & drop or click to browse</p>
                <Button variant="outline" size="lg">Choose Files</Button>
                <p className="text-sm text-muted-foreground">Supports PDF files up to 10MB</p>
              </div>
            </div>

            <AnimatePresence>
              {uploadedFiles.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="mt-8 space-y-4"
                >
                  <h4 className="text-lg font-semibold">Uploaded Documents ({uploadedFiles.length})</h4>
                  <AnimatePresence>
                    {uploadedFiles.map(({ file, id, status, progress, fileUrl, previewUrl }) => (
                      <motion.div
                        key={id}
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -50 }}
                        transition={{ duration: 0.3 }}
                        className="flex items-center gap-4 p-4 bg-muted rounded-lg"
                      >
                        <FileText className="h-8 w-8 text-legal-navy" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <a href={fileUrl || previewUrl} target="_blank" rel="noopener noreferrer" className="font-medium truncate text-legal-navy hover:underline flex items-center gap-1">
                              {file.name}<ExternalLink className="h-4 w-4" />
                            </a>
                            <span className="text-sm text-muted-foreground">{formatFileSize(file.size)}</span>
                          </div>
                          {status === "uploading" && (
                            <div className="w-full bg-border rounded-full h-2 overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.5 }}
                                className="bg-legal-navy h-full rounded-full"
                              ></motion.div>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <AnimatePresence mode="wait">
                            {status === "ready" && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0 }}
                              >
                                <Button variant="ghost" size="sm" onClick={() => removeFile(id)}><X className="h-4 w-4" /></Button>
                              </motion.div>
                            )}
                            {status === "uploading" && (
                              <motion.div
                                key="uploading"
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0 }}
                              >
                                <Loader2 className="h-5 w-5 animate-spin text-legal-navy" />
                              </motion.div>
                            )}
                            {status === "success" && (
                              <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1, rotate: 360 }}
                              >
                                <CheckCircle className="h-5 w-5 text-success-green" />
                              </motion.div>
                            )}
                            {status === "error" && (
                              <motion.div
                                key="error"
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1, rotate: [0, -10, 10, -10, 0] }}
                                transition={{ type: "spring", stiffness: 500, damping: 10 }}
                              >
                                <AlertTriangle className="h-5 w-5 text-destructive" />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  <div className="flex justify-center pt-4">
                    <Button
                      size="lg"
                      onClick={handleSubmit}
                      disabled={uploadedFiles.length === 0 || uploadedFiles.some(f => f.status === "uploading")}
                      className="min-w-48"
                    >
                      {uploadedFiles.some(f => f.status === "uploading") ? (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="flex items-center"
                        >
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />Uploading...
                        </motion.span>
                      ) : (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="flex items-center"
                        >
                          Upload to Cloud<FileText className="ml-2 h-4 w-4" />
                        </motion.span>
                      )}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </div>
      </div>
    </section>
  );
}