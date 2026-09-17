import React from "react";
import { AlertOctagon, RefreshCw } from "lucide-react";
import { useWallet } from "../hooks/useWallet";

export function NetworkWarning() {
  const { isConnected, isCorrectNetwork, targetChainId, switchNetwork } = useWallet();

  if (!isConnected || isCorrectNetwork) return null;

  return (
    <div className="bg-amber-500 text-white px-4 py-3 shadow-sm border-b border-amber-600">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm font-medium">
        <div className="flex items-center gap-2">
          <AlertOctagon className="w-5 h-5 flex-shrink-0 animate-pulse text-amber-100" />
          <span>
            Wrong Network Detected! Please switch MetaMask to the local Hardhat network (Chain ID {targetChainId}).
          </span>
        </div>
        <button
          onClick={switchNetwork}
          className="inline-flex items-center gap-1.5 px-3 py-1 bg-white text-amber-900 rounded-md font-semibold text-xs hover:bg-amber-50 transition-colors shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Switch Network
        </button>
      </div>
    </div>
  );
}
