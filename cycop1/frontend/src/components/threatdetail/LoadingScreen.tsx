// components/ThreatDetail/LoadingScreen.tsx

import React, { useState, useEffect } from "react";
import { Shield, Terminal } from "lucide-react";

export const LoadingScreen = () => {
  const [loadingText, setLoadingText] = useState("INITIALIZING SYSTEM...");
  const [progress, setProgress] = useState(0);

  // Mock Loading Steps
  useEffect(() => {
    const steps = [
      { msg: "ESTABLISHING SECURE CONNECTION...", time: 0 },
      { msg: "VERIFYING USER CREDENTIALS...", time: 800 },
      { msg: "DECRYPTING THREAT DATA...", time: 1600 },
      { msg: "LOADING ASSETS & MAPS...", time: 2400 },
      { msg: "SYSTEM READY.", time: 3200 },
    ];

    steps.forEach((step) => {
      setTimeout(() => setLoadingText(step.msg), step.time);
    });

    // Fake Progress Bar
    const interval = setInterval(() => {
      setProgress((prev) => (prev < 100 ? prev + 2 : 100));
    }, 50);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black text-slate-200 font-mono">
      {/* Background Grid & Noise */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none"></div>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,24,27,0)_1px,transparent_1px),linear-gradient(90deg,rgba(18,24,27,0)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)] opacity-20"></div>

      {/* Main Spinner Container */}
      <div className="relative w-32 h-32 mb-8">
        {/* Outer Ring */}
        <div className="absolute inset-0 border-4 border-slate-800 rounded-full"></div>
        <div className="absolute inset-0 border-t-4 border-blue-500 rounded-full animate-spin"></div>
        
        {/* Inner Ring (Reverse Spin) */}
        <div className="absolute inset-2 border-4 border-slate-800 rounded-full"></div>
        <div 
            className="absolute inset-2 border-b-4 border-cyan-400 rounded-full animate-spin" 
            style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}
        ></div>

        {/* Center Logo/Icon */}
        <div className="absolute inset-0 flex items-center justify-center">
            {/* ใส่ Logo RTARF ตรงนี้ได้ */}
             <div className="relative">
                <div className="absolute inset-0 bg-blue-500 blur-lg opacity-40 animate-pulse"></div>
                <Shield size={32} className="text-white relative z-10" />
             </div>
        </div>
      </div>

      {/* Text Info */}
      <div className="text-center space-y-2 relative z-10">
        <div className="text-xl font-bold tracking-[0.2em] text-white animate-pulse">
            CYBER DEFENSE OPS
        </div>
        
        <div className="flex items-center justify-center gap-2 text-xs text-cyan-400 h-6">
            <Terminal size={12} />
            <span className="typing-effect">{loadingText}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-64 h-1 bg-slate-800 mt-6 rounded-full overflow-hidden relative">
        <div 
            className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-75 ease-out"
            style={{ width: `${progress}%` }}
        ></div>
      </div>
      
      <div className="mt-2 text-[10px] text-slate-500">
         LOADING RESOURCES ({progress}%)
      </div>
    </div>
  );
};