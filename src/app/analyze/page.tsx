"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function AnalyzePage() {
  const searchParams = useSearchParams();
  const fileUrl = searchParams.get("fileUrl"); // get uploaded file URL
  const [analysisResult, setAnalysisResult] = useState<string>("");

  useEffect(() => {
    if (!fileUrl) return;

    // Call your backend API to analyze the PDF
    fetch("http://127.0.0.1:8000/analyze", {
      method: "POST",
      body: JSON.stringify({ fileUrl }),
      headers: { "Content-Type": "application/json" },
    })
      .then((res) => res.json())
      .then((data) => setAnalysisResult(data.result))
      .catch((err) => console.error(err));
  }, [fileUrl]);

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-4">Analysis Result</h1>
      {fileUrl && (
        <iframe
          src={fileUrl}
          className="w-full h-96 border"
          title="Uploaded PDF"
        />
      )}
      <div className="mt-6 p-4 bg-muted rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Analysis Output:</h2>
        <pre>{analysisResult || "Analyzing..."}</pre>
      </div>
    </div>
  );
}
