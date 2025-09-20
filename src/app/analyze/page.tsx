"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

// (Interface definitions remain the same)
interface ClauseAnalysis {
  Clause: string;
  risky: boolean;
  score: number;
  summary: string;
  reason: string;
  category: string;
}

interface DocumentSummary {
  overall_risk_score: number;
  risk_summary: string;
  total_clauses: number;
  risky_clause_count: number;
}

interface AnalysisResponse {
  document_summary: DocumentSummary;
  clause_by_clause_analysis: ClauseAnalysis[];
}

export default function AnalyzePage() {
  const searchParams = useSearchParams();
  const fileUrl = searchParams.get("fileUrl");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);

  useEffect(() => {
    if (!fileUrl) {
      setError("No file URL provided");
      setLoading(false);
      return;
    }

    const fetchAnalysis = async () => {
      try {
        setLoading(true);
        const res = await fetch(`http://127.0.0.1:8000/analyze?fileUrl=${encodeURIComponent(fileUrl)}`);
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Failed to fetch analysis");
        }
        const data: AnalysisResponse = await res.json();
        setAnalysisResult(data);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "An error occurred while fetching analysis");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [fileUrl]);
  
  useEffect(() => {
    if (loading) {
      setProgress(0);
      let currentProgress = 0;

      const interval = setInterval(() => {
        // Change the behavior to reach 95%
        if (currentProgress < 95) {
          currentProgress += Math.random() * 5;
          setProgress(Math.min(currentProgress, 95));
        }
      }, 300);

      return () => {
        clearInterval(interval);
      };
    } else {
      setProgress(100);
    }
  }, [loading]);

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Document Analysis</h1>

      {fileUrl && (
        <iframe
          src={fileUrl}
          className="w-full h-96 border rounded-lg mb-6"
          title="Uploaded PDF"
        />
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center">
          <p className="text-lg text-muted-foreground mb-4">Analyzing document, please wait...</p>
          <div className="w-1/2 bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
            <div 
              className="bg-legal-navy h-2.5 rounded-full transition-all duration-500 ease-out" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="mt-2">{Math.round(progress)}%</p>
        </div>
      )}

      {error && (
        <p className="text-lg text-destructive mb-4">Error: {error}</p>
      )}

      {analysisResult && (
        <>
          <div className="mb-6 p-4 bg-muted rounded-lg">
            <h2 className="text-xl font-semibold mb-2">Overall Document Risk Summary</h2>
            <p><strong>Overall Risk Score:</strong> {analysisResult.document_summary.overall_risk_score}</p>
            <p><strong>Total Clauses:</strong> {analysisResult.document_summary.total_clauses}</p>
            <p><strong>Risky Clauses:</strong> {analysisResult.document_summary.risky_clause_count}</p>
            <p className="mt-2 whitespace-pre-line">{analysisResult.document_summary.risk_summary}</p>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-2">Clause-by-Clause Analysis</h2>
            {analysisResult.clause_by_clause_analysis.map((c, idx) => (
              <div key={idx} className="p-4 bg-muted rounded-lg border-l-4 border-legal-navy">
                <p><strong>Clause:</strong> {c.Clause}</p>
                <p><strong>Risky:</strong> {c.risky ? "Yes" : "No"}</p>
                <p><strong>Score:</strong> {c.score}</p>
                <p><strong>Summary:</strong> {c.summary}</p>
                <p><strong>Reason:</strong> {c.reason}</p>
                <p><strong>Category:</strong> {c.category}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}