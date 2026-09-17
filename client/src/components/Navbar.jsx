import React from "react";
import { NavLink } from "react-router-dom";
import { Wallet, ShieldCheck, Layers, LayoutDashboard, Search, ShieldAlert, Cpu } from "lucide-react";
import { useWallet } from "../hooks/useWallet";
import { formatAddress } from "../utils/formatters";

export function Navbar() {
  const {
    account,
    balance,
    isConnected,
    isOwner,
    isCorrectNetwork,
    connectWallet,
  } = useWallet();

  const navItemClass = ({ isActive }) =>
    `inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
      isActive
        ? "bg-indigo-50 text-indigo-700 shadow-sm font-semibold"
        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
    }`;

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-200">
              <Cpu className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg text-slate-900 tracking-tight">
              SubWallet <span className="text-xs font-semibold px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full ml-1">Web3</span>
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <NavLink to="/" end className={navItemClass}>
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </NavLink>
            <NavLink to="/plans" className={navItemClass}>
              <Layers className="w-4 h-4" />
              Services
            </NavLink>
            <NavLink to="/my-subscription" className={navItemClass}>
              <ShieldCheck className="w-4 h-4" />
              My Subscriptions
            </NavLink>
            <NavLink to="/verify" className={navItemClass}>
              <Search className="w-4 h-4" />
              Verify
            </NavLink>
            {isOwner && (
              <NavLink to="/admin" className={navItemClass}>
                <ShieldAlert className="w-4 h-4 text-indigo-600" />
                Admin / Provider
              </NavLink>
            )}
          </nav>

          {/* Right Action Bar */}
          <div className="flex items-center gap-3">
            {/* Network Indicator */}
            {isConnected && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border bg-slate-50">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isCorrectNetwork ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                  }`}
                />
                <span className={isCorrectNetwork ? "text-slate-700" : "text-amber-700 font-bold"}>
                  {isCorrectNetwork ? "Hardhat Local (31337)" : "Wrong Network"}
                </span>
              </div>
            )}

            {/* Wallet Button */}
            {isConnected ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:block text-right">
                  <div className="text-xs font-bold text-slate-900">{parseFloat(balance).toFixed(3)} ETH</div>
                  <div className="text-[10px] font-mono text-slate-500">{formatAddress(account)}</div>
                </div>
                <div className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold shadow-sm border border-slate-800">
                  <Wallet className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{formatAddress(account)}</span>
                  {isOwner && (
                    <span className="ml-1 px-1.5 py-0.2 bg-indigo-500/30 text-indigo-300 rounded text-[10px]">
                      Admin
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl shadow-md shadow-indigo-200 transition-all active:scale-95"
              >
                <Wallet className="w-4 h-4" />
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </div>
      {/* Mobile nav */}
      <div className="md:hidden border-t border-slate-200 px-4 py-2 flex items-center justify-around text-xs font-medium bg-slate-50">
        <NavLink to="/" end className={navItemClass}>Dashboard</NavLink>
        <NavLink to="/plans" className={navItemClass}>Services</NavLink>
        <NavLink to="/my-subscription" className={navItemClass}>My Subscriptions</NavLink>
        <NavLink to="/verify" className={navItemClass}>Verify</NavLink>
        {isOwner && <NavLink to="/admin" className={navItemClass}>Admin</NavLink>}
      </div>
    </header>
  );
}
