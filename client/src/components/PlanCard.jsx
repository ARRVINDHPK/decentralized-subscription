import React from "react";
import { Check, Zap, Clock, Shield } from "lucide-react";
import { formatEth, formatDuration } from "../utils/formatters";

export function PlanCard({
  plan,
  onSubscribe,
  isCurrentPlan = false,
  isUserSubActive = false,
  isProcessing = false,
  disabled = false,
}) {
  const { id, name, description, price, duration, active } = plan;

  return (
    <div
      className={`relative bg-white rounded-2xl p-6 transition-all duration-200 border ${
        isCurrentPlan && isUserSubActive
          ? "border-indigo-600 ring-2 ring-indigo-600/20 shadow-lg"
          : active
          ? "border-slate-200 hover:border-indigo-200 hover:shadow-md"
          : "border-slate-200 bg-slate-50/50 opacity-75"
      }`}
    >
      {/* Featured Badge */}
      {isCurrentPlan && isUserSubActive && (
        <span className="absolute -top-3 right-6 bg-indigo-600 text-white text-[10px] uppercase font-bold tracking-wider px-3 py-1 rounded-full shadow-sm">
          Your Current Plan
        </span>
      )}

      {!active && (
        <span className="absolute -top-3 right-6 bg-slate-600 text-white text-[10px] uppercase font-bold tracking-wider px-3 py-1 rounded-full shadow-sm">
          Inactive
        </span>
      )}

      <div className="flex items-center justify-between">
        <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
          <Zap className="w-5 h-5" />
        </div>
        <span className="text-xs font-mono font-medium text-slate-400">Plan #{id}</span>
      </div>

      <h3 className="mt-4 text-xl font-bold text-slate-900">{name}</h3>
      <p className="mt-1 text-sm text-slate-600 min-h-[2.5rem] leading-relaxed">
        {description}
      </p>

      {/* Pricing */}
      <div className="mt-6 pt-6 border-t border-slate-100 flex items-baseline gap-2">
        <span className="text-3xl font-extrabold text-slate-900">{formatEth(price, 4)}</span>
        <span className="text-xs font-medium text-slate-500">/ {formatDuration(duration)}</span>
      </div>

      {/* Feature Points */}
      <div className="mt-6 space-y-2.5">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <Clock className="w-4 h-4 text-indigo-500" />
          <span>Duration: <strong>{formatDuration(duration)}</strong></span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <Shield className="w-4 h-4 text-emerald-500" />
          <span>Recorded on Smart Contract</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <Check className="w-4 h-4 text-indigo-500" />
          <span>Full Service Access</span>
        </div>
      </div>

      {/* Action Button */}
      <div className="mt-6">
        <button
          onClick={() => onSubscribe(plan)}
          disabled={!active || disabled || isProcessing || (isCurrentPlan && isUserSubActive)}
          className={`w-full py-3 px-4 rounded-xl text-sm font-semibold shadow-sm transition-all flex items-center justify-center gap-2 ${
            isCurrentPlan && isUserSubActive
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default"
              : active && !disabled
              ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 active:scale-98"
              : "bg-slate-200 text-slate-400 cursor-not-allowed"
          }`}
        >
          {isProcessing ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Confirming...</span>
            </>
          ) : isCurrentPlan && isUserSubActive ? (
            "Subscribed"
          ) : !active ? (
            "Plan Deactivated"
          ) : (
            "Subscribe Now"
          )}
        </button>
      </div>
    </div>
  );
}
