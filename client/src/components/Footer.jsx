import React from "react";
import { Cpu, ShieldCheck, Github } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200 mt-auto py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 text-sm">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-indigo-600" />
          <span className="font-semibold text-slate-700">Decentralized Subscription Payment System</span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span>React + Vite + Hardhat + ethers.js</span>
          <span>•</span>
          <span className="flex items-center gap-1 text-emerald-600 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" /> Direct Smart Contract Integration
          </span>
        </div>
        <div className="text-xs text-slate-400">
          Academic Demonstration Project
        </div>
      </div>
    </footer>
  );
}
