'use client'
import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams ,useRouter} from "next/navigation";
import { FaExclamationTriangle, FaCheckCircle, FaExclamationCircle } from "react-icons/fa";
import { AiOutlineMessage } from 'react-icons/ai';
import { IoClose, IoArrowForwardSharp ,IoArrowBack} from 'react-icons/io5';
import { motion, AnimatePresence } from 'framer-motion';

// ... (Your existing interfaces and helper functions)

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

interface ChatMessage {
  sender: 'bot' | 'user';
  text: string;
}

export default function AnalyzePage() {
  const router = useRouter();

  const searchParams = useSearchParams();
  const fileUrl = searchParams.get("fileUrl");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);

  // Chatbot State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([{
    sender: 'bot',
    text: 'Hi! I am Noire, your legal assistant. Ask me anything about this document!'
  }]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isChatOpen]);

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

  const handleChatUserMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || !fileUrl) return;

    // Add user message to state immediately
    const userMessage: ChatMessage = { sender: 'user', text: trimmed };
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    try {
      // Call the new backend endpoint
      const res = await fetch(`http://127.0.0.1:8000/chat?fileUrl=${encodeURIComponent(fileUrl)}&question=${encodeURIComponent(trimmed)}`);
      if (!res.ok) {
        throw new Error("Failed to get chatbot response.");
      }
      const data = await res.json();
      const botMessage: ChatMessage = { sender: 'bot', text: data.answer };
      setMessages(prev => [...prev, botMessage]);
    } catch (err: any) {
      console.error(err);
      const errorMessage: ChatMessage = { sender: 'bot', text: "Sorry, I'm having trouble connecting right now." };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const chatPanelVariants = {
    hidden: { opacity: 0, scale: 0.8, y: 50 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0, 
      transition: { 
        duration: 0.3,
      } 
    },
  };

  const messageVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="bg-gray-100 min-h-screen font-sans p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="py-8">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/')}
              className="p-2 rounded-full hover:bg-gray-200 transition-colors duration-200"
              title="Go back"
            >
              <IoArrowBack size={24} className="text-gray-600" />
            </button>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight flex-1 text-center pr-12">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                AI Document Analysis
              </span>
            </h1>
          </div>
          <p className="mt-2 text-lg text-gray-600 text-center">Your legal documents, simplified.</p>
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

      <div className="fixed bottom-6 right-6 z-50">
        <AnimatePresence>
          {isChatOpen && (
            <motion.div
              className="bg-white shadow-2xl w-[400px] h-[600px] flex flex-col border border-gray-200 rounded-xl overflow-hidden"
              variants={chatPanelVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
            >
              <div className="flex justify-between items-center p-4 bg-gray-900 text-white shadow-md">
                <p className="text-xl font-semibold">Noire Chatbot</p>
                <motion.button
                  whileHover={{ rotate: 90, scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-1 rounded-full text-white"
                  onClick={() => setIsChatOpen(false)}
                >
                  <IoClose size={24} />
                </motion.button>
              </div>
              <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50">
                <AnimatePresence>
                  {messages.map((msg, i) => (
                    <motion.div
                      key={i}
                      className={`p-3 rounded-2xl max-w-[85%] break-words shadow-sm text-base ${
                        msg.sender === 'bot'
                          ? 'bg-blue-100 text-gray-800 self-start'
                          : 'bg-indigo-600 text-white self-end ml-auto'
                      }`}
                      variants={messageVariants}
                      initial="hidden"
                      animate="visible"
                      transition={{ delay: i * 0.1, duration: 0.3 }}
                    >
                      {msg.text}
                    </motion.div>
                  ))}
                  <div ref={bottomRef} />
                </AnimatePresence>
              </div>
              <div className="p-4 border-t border-gray-200 bg-white flex items-center">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleChatUserMessage()}
                  placeholder="Ask about this document..."
                  className="flex-1 p-3 text-base border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleChatUserMessage}
                  className="ml-3 p-3 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-colors duration-200"
                >
                  <IoArrowForwardSharp size={20} />
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!isChatOpen && (
          <motion.button
            onClick={() => setIsChatOpen(true)}
            className="bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 transition-all duration-300"
            whileHover={{ scale: 1.1, rotate: 15 }}
            whileTap={{ scale: 0.9 }}
          >
            <AiOutlineMessage size={30} />
          </motion.button>
        )}
      </div>
    </div>
  );
}