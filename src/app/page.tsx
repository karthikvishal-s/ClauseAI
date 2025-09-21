"use client"

import { Button } from "./components/button";
import  { useToast } from "./hooks/use-toast"
import Link from "next/link";
import { FileText, Sparkles, Shield, Zap } from "lucide-react";

export default function Home() {
  const { toast } = useToast()   
  return (
    <section className="bg-blue-500 relative min-h-screen flex items-center justify-center overflow-hidden ">

      <div className="bg-blue-700 absolute inset-0 bg-gradient-hero"></div>
      
      {/* Floating elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 animate-float">
          <Shield className="h-8 w-8 text-white/20" />
        </div>
        <div className="absolute top-32 right-20 animate-float" style={{ animationDelay: "4s" }}>
          <Sparkles className="h-6 w-6 text-white/20" />
        </div>
        <div className="absolute bottom-32 left-20 animate-float" style={{ animationDelay: "2s" }}>
          <Zap className="h-10 w-10 text-white/20" />
        </div>
        <div className="absolute bottom-20 right-10 animate-float" style={{ animationDelay: "1.5s" }}>
          <FileText className="h-8 w-8 text-white/20" />
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 container mx-auto px-6 text-center text-white">
        <div className="animate-slide-up">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-8 border border-white/20">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">AI-Powered Legal Analysis</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            Clause AI
            <br />
          </h1>
          
          <p className="text-xl md:text-2xl text-white/80 mb-8 max-w-3xl mx-auto leading-relaxed">
            Transform complex legal jargon into clear, understandable insights with our 
            cutting-edge AI technology. Upload any legal document and get instant analysis.
          </p>

          {/* CTA Button */}
          <div className="mb-8">
        
            <Link href="/upload">
              <button className="px-6 py-3 bg-white text-black font-semibold rounded-full shadow-lg hover:bg-white/90 transition">
                Get Started
              </button>
              
            </Link>
          </div>
          
          {/* Features */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <div className="flex items-center gap-2 text-white/70">
              <Shield className="h-5 w-5" />
              <span className="text-sm">Secure & Confidential</span>
            </div>
            <div className="flex items-center gap-2 text-white/70">
              <Zap className="h-5 w-5" />
              <span className="text-sm">Instant Analysis</span>
            </div>
            <div className="flex items-center gap-2 text-white/70">
              <FileText className="h-5 w-5" />
              <span className="text-sm">All Document Types</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom scroll indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <div className="w-1 h-16 bg-white/20 rounded-full relative overflow-hidden">
          <div className="w-full h-4 bg-white/60 rounded-full animate-pulse"></div>
        </div>
      </div>
    </section>
  );
}
