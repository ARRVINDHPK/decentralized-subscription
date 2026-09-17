import React from "react";
import { CheckCircle2, AlertTriangle, XCircle, MinusCircle } from "lucide-react";

export function StatusBadge({ status, size = "md" }) {
  const normalized = (status || "").toLowerCase();

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs gap-1",
    md: "px-3 py-1 text-xs sm:text-sm gap-1.5 font-medium",
    lg: "px-4 py-1.5 text-sm font-semibold gap-2",
  };

  if (normalized === "active") {
    return (
      <span
        className={`inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20 ${sizeClasses[size]}`}
      >
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        Active
      </span>
    );
  }

  if (normalized === "expired") {
    return (
      <span
        className={`inline-flex items-center rounded-full bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20 ${sizeClasses[size]}`}
      >
        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
        Expired
      </span>
    );
  }

  if (normalized === "cancelled") {
    return (
      <span
        className={`inline-flex items-center rounded-full bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20 ${sizeClasses[size]}`}
      >
        <XCircle className="w-3.5 h-3.5 text-rose-600" />
        Cancelled
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded-full bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-500/10 ${sizeClasses[size]}`}
    >
      <MinusCircle className="w-3.5 h-3.5 text-slate-400" />
      Not Subscribed
    </span>
  );
}
