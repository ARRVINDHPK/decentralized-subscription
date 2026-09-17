import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, RefreshCw, XCircle, Wallet, Calendar, CheckCircle2, AlertTriangle, ArrowRight, Music, Tv, ShoppingBag, Youtube, Layers } from "lucide-react";
import { useWallet } from "../hooks/useWallet";
import { getUserSubscriptions, getPlan, getProviderDetails, isSubscriptionActive, renewUserSubscription, cancelUserSubscription } from "../services/contract";
import { StatusBadge } from "../components/StatusBadge";
import { ConfirmModal } from "../components/ConfirmModal";
import { formatDate, formatEth, getRemainingTime } from "../utils/formatters";

export function MySubscription() {
  const { account, isConnected, connectWallet, isCorrectNetwork } = useWallet();

  const [subscriptionsList, setSubscriptionsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingPlanId, setProcessingPlanId] = useState(null);
  const [cancelTargetPlanId, setCancelTargetPlanId] = useState(null);
  const [statusMsg, setStatusMsg] = useState(null);

  const fetchUserSubscriptionsData = async () => {
    if (!isConnected || !account || !isCorrectNetwork) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setStatusMsg(null);
    try {
      const rawSubs = await getUserSubscriptions(account);
      const fullSubs = [];

      for (const sub of rawSubs) {
        let planData = null;
        let providerData = null;
        try {
          planData = await getPlan(sub.planId);
          providerData = await getProviderDetails(sub.providerId);
        } catch (err) {
          console.warn(`Failed to fetch metadata for plan #${sub.planId}`, err);
        }

        const activeOnChain = await isSubscriptionActive(account, sub.planId);

        let derivedStatus = "Not Subscribed";
        if (sub.exists) {
          if (!sub.active) derivedStatus = "Cancelled";
          else if (!activeOnChain) derivedStatus = "Expired";
          else derivedStatus = "Active";
        }

        fullSubs.push({
          ...sub,
          plan: planData,
          provider: providerData,
          activeOnChain,
          derivedStatus,
        });
      }

      setSubscriptionsList(fullSubs);
    } catch (err) {
      console.error("Failed to fetch user subscriptions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserSubscriptionsData();
  }, [isConnected, account, isCorrectNetwork]);

  const handleRenewPlan = async (subItem) => {
    if (!subItem.plan) return;

    setProcessingPlanId(subItem.planId);
    setStatusMsg({ type: "pending", text: `Confirming renewal transaction in MetaMask for ${subItem.plan.name}...` });

    try {
      await renewUserSubscription(subItem.planId, subItem.plan.price);
      setStatusMsg({ type: "success", text: `Successfully renewed ${subItem.plan.name}!` });
      await fetchUserSubscriptionsData();
    } catch (err) {
      console.error("Renewal failed:", err);
      let errMsg = err?.reason || err?.message || "Renewal transaction failed.";
      if (errMsg.includes("user rejected")) errMsg = "Renewal cancelled in MetaMask.";
      setStatusMsg({ type: "error", text: errMsg });
    } finally {
      setProcessingPlanId(null);
    }
  };

  const handleCancelConfirm = async () => {
    if (!cancelTargetPlanId) return;

    const planId = cancelTargetPlanId;
    setCancelTargetPlanId(null);
    setProcessingPlanId(planId);
    setStatusMsg({ type: "pending", text: "Processing cancellation in MetaMask..." });

    try {
      await cancelUserSubscription(planId);
      setStatusMsg({ type: "success", text: "Subscription successfully cancelled." });
      await fetchUserSubscriptionsData();
    } catch (err) {
      console.error("Cancellation failed:", err);
      let errMsg = err?.reason || err?.message || "Cancellation failed.";
      if (errMsg.includes("user rejected")) errMsg = "Cancellation cancelled in MetaMask.";
      setStatusMsg({ type: "error", text: errMsg });
    } finally {
      setProcessingPlanId(null);
    }
  };

  const getProviderIcon = (name) => {
    const n = (name || "").toLowerCase();
    if (n.includes("spotify")) return <Music className="w-5 h-5 text-emerald-500" />;
    if (n.includes("netflix")) return <Tv className="w-5 h-5 text-rose-500" />;
    if (n.includes("prime") || n.includes("amazon")) return <ShoppingBag className="w-5 h-5 text-amber-500" />;
    if (n.includes("youtube")) return <Youtube className="w-5 h-5 text-rose-600" />;
    return <Layers className="w-5 h-5 text-indigo-500" />;
  };

  if (!isConnected) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center space-y-6">
        <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
          <Wallet className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Connect Wallet Required</h2>
        <p className="text-slate-600 text-sm leading-relaxed">
          Please connect your MetaMask wallet to view your personal multi-subscription dashboard.
        </p>
        <button
          onClick={connectWallet}
          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-md transition-all"
        >
          <Wallet className="w-4 h-4" />
          Connect MetaMask
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">My Subscriptions</h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage your active, expired, and cancelled service subscriptions independently from one wallet.
          </p>
        </div>
        <button
          onClick={fetchUserSubscriptionsData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors shadow-xs self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh All
        </button>
      </div>

      {/* Transaction status alert */}
      {statusMsg && (
        <div
          className={`p-4 rounded-xl text-sm font-medium flex items-center gap-3 border ${
            statusMsg.type === "pending"
              ? "bg-indigo-50 text-indigo-800 border-indigo-200"
              : statusMsg.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          {statusMsg.type === "pending" && (
            <span className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          )}
          {statusMsg.type === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />}
          {statusMsg.type === "error" && <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />}
          <span className="flex-1">{statusMsg.text}</span>
        </div>
      )}

      {/* Main Subscriptions Grid */}
      {loading ? (
        <div className="py-20 text-center space-y-3 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 text-sm">Querying smart contract for user subscriptions...</p>
        </div>
      ) : subscriptionsList.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm space-y-4">
          <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-xl font-bold text-slate-900">No active subscriptions yet</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            You have not subscribed to any service providers yet. Browse available service plans to subscribe.
          </p>
          <div className="pt-2">
            <Link
              to="/plans"
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-md transition-all"
            >
              Browse Services & Plans
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {subscriptionsList.map((item) => {
            const remaining = getRemainingTime(item.expiryTime);
            const isProcessingThis = processingPlanId === item.planId;

            return (
              <div
                key={item.planId}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between"
              >
                {/* Header */}
                <div className="p-6 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-xl shadow-xs border border-slate-200">
                      {getProviderIcon(item.provider?.name)}
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-indigo-600 tracking-wider">
                        {item.provider?.name || `Provider #${item.providerId}`}
                      </span>
                      <h3 className="text-lg font-bold text-slate-900 leading-tight">
                        {item.plan?.name || `Plan #${item.planId}`}
                      </h3>
                    </div>
                  </div>
                  <StatusBadge status={item.derivedStatus} size="sm" />
                </div>

                {/* Body Details */}
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block font-medium">Price</span>
                      <span className="font-bold text-slate-900 text-sm">
                        {item.plan ? formatEth(item.plan.price) : formatEth(item.amountPaid)}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block font-medium">Time Remaining</span>
                      <span
                        className={`font-bold text-xs ${
                          remaining.expired ? "text-rose-600" : "text-emerald-600"
                        }`}
                      >
                        {remaining.text}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block font-medium">Start Date</span>
                      <span className="font-semibold text-slate-700">{formatDate(item.startTime)}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block font-medium">Expiry Date</span>
                      <span className="font-semibold text-slate-700">{formatDate(item.expiryTime)}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                  {item.active && (
                    <button
                      onClick={() => setCancelTargetPlanId(item.planId)}
                      disabled={isProcessingThis}
                      className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs rounded-xl border border-rose-200 transition-colors flex items-center gap-1.5"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Cancel
                    </button>
                  )}

                  {item.active && (
                    <button
                      onClick={() => handleRenewPlan(item)}
                      disabled={isProcessingThis}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isProcessingThis ? "animate-spin" : ""}`} />
                      {isProcessingThis ? "Renewing..." : "Renew"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation modal for targeted cancellation */}
      <ConfirmModal
        isOpen={!!cancelTargetPlanId}
        title="Cancel Specific Subscription?"
        message="Are you sure you want to cancel this specific subscription? Cancelling stops this service from being active on-chain while keeping your other active subscriptions completely untouched."
        confirmText="Confirm Cancellation"
        confirmVariant="danger"
        isLoading={!!processingPlanId}
        onConfirm={handleCancelConfirm}
        onClose={() => setCancelTargetPlanId(null)}
      />
    </div>
  );
}
