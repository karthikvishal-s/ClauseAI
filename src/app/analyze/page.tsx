"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { FaExclamationTriangle, FaCheckCircle, FaExclamationCircle } from "react-icons/fa";

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

const getCardClass = (score: number) => {
  if (score > 69) {
    return "bg-red-50 border-red-200 shadow-lg hover:shadow-xl";
  } else if (score >= 50) {
    return "bg-yellow-50 border-yellow-200 shadow-lg hover:shadow-xl";
  }
  return "bg-green-50 border-green-200 shadow-lg hover:shadow-xl";
};

const getIcon = (score: number) => {
  if (score > 69) {
    return <FaExclamationTriangle className="text-red-500 w-6 h-6" />;
  } else if (score >= 50) {
    return <FaExclamationCircle className="text-yellow-500 w-6 h-6" />;
  }
  return <FaCheckCircle className="text-green-500 w-6 h-6" />;
};

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
    <div className="bg-gray-100 min-h-screen font-sans p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="text-center py-8">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
              AI Document Analysis
            </span>
          </h1>
          <p className="mt-2 text-lg text-gray-600">Your legal documents, simplified.</p>
        </header>

        {fileUrl && (
          <div className="mb-8 rounded-2xl overflow-hidden shadow-2xl transition-transform duration-500 hover:scale-[1.01] relative">
            <iframe
              src={fileUrl}
              className="w-full h-96 border-none"
              title="Uploaded PDF"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900/50 to-transparent pointer-events-none"></div>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center p-8 bg-white rounded-xl shadow-lg">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-xl font-semibold text-gray-700 mb-2">Analyzing Document...</p>
            <p className="text-sm text-gray-500">Please wait while our AI reviews the content.</p>
            <div className="w-full max-w-lg mt-6 bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-gradient-to-r from-blue-400 to-blue-600 h-2.5 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="mt-2 text-sm font-medium text-gray-700">{Math.round(progress)}%</p>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-xl max-w-xl mx-auto" role="alert">
            <div className="flex items-center">
              <FaExclamationCircle className="w-6 h-6 mr-3" />
              <div>
                <p className="font-bold">An Error Occurred</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {analysisResult && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <div className="p-6 bg-white rounded-xl shadow-lg border-l-4 border-blue-500 flex flex-col justify-between">
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Overall Risk Score</p>
                <div className="flex items-center mt-2">
                  <p className="text-4xl font-bold text-gray-800">{analysisResult.document_summary.overall_risk_score}</p>
                  <span className="ml-2 text-blue-500 text-sm">/ 100</span>
                </div>
              </div>
              <div className="p-6 bg-white rounded-xl shadow-lg border-l-4 border-purple-500 flex flex-col justify-between">
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Total Clauses</p>
                <p className="text-4xl font-bold text-gray-800 mt-2">{analysisResult.document_summary.total_clauses}</p>
              </div>
              <div className="p-6 bg-white rounded-xl shadow-lg border-l-4 border-orange-500 flex flex-col justify-between">
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Risky Clauses</p>
                <p className="text-4xl font-bold text-gray-800 mt-2">{analysisResult.document_summary.risky_clause_count}</p>
              </div>
            </div>

            <div className="mb-8 p-6 bg-white rounded-xl shadow-lg border-t-4 border-blue-500">
              <h2 className="text-xl font-bold text-gray-800 mb-2">Risk Summary</h2>
              <p className="text-gray-600 leading-relaxed whitespace-pre-line">{analysisResult.document_summary.risk_summary}</p>
            </div>

            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800">Clause Analysis</h2>
              {analysisResult.clause_by_clause_analysis.map((c, idx) => (
                <div key={idx} className={`p-6 border rounded-2xl transition-all duration-300 ${getCardClass(c.score)}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      {getIcon(c.score)}
                      <span className="text-lg font-bold text-gray-900 ml-2">Clause {idx + 1}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm font-semibold text-gray-500">Score:</span>
                      <span className="ml-1 text-lg font-bold text-gray-800">{c.score}</span>
                    </div>
                  </div>
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Clause Text</p>
                    <p className="mt-1 text-gray-700 leading-relaxed">{c.Clause}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Summary</p>
                      <p className="mt-1 text-gray-600">{c.summary}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Reason</p>
                      <p className="mt-1 text-gray-600">{c.reason}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Category</p>
                      <p className="mt-1 text-gray-600">{c.category}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}