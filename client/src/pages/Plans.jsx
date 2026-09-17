import React, { useEffect, useState } from "react";
import { Layers, AlertCircle, CheckCircle2, Tv, Music, ShoppingBag, Youtube, Zap } from "lucide-react";
import { useWallet } from "../hooks/useWallet";
import { getAllServicesWithPlans, subscribeToPlan, isSubscriptionActive } from "../services/contract";
import { PlanCard } from "../components/PlanCard";

export function Plans() {
  const { isConnected, account, isCorrectNetwork, connectWallet } = useWallet();
  const [services, setServices] = useState([]);
  const [activePlanIds, setActivePlanIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [processingPlanId, setProcessingPlanId] = useState(null);
  const [txMessage, setTxMessage] = useState(null);

  const loadServicesData = async () => {
    setLoading(true);
    setTxMessage(null);
    try {
      const data = await getAllServicesWithPlans();
      setServices(data);

      if (isConnected && account && isCorrectNetwork) {
        const activeSet = new Set();
        for (const s of data) {
          for (const plan of s.plans) {
            const active = await isSubscriptionActive(account, plan.id);
            if (active) {
              activeSet.add(plan.id);
            }
          }
        }
        setActivePlanIds(activeSet);
      }
    } catch (err) {
      console.error("Error loading services:", err);
      setTxMessage({
        type: "error",
        text: "Failed to load services from smart contract. Ensure Hardhat node is running.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServicesData();
  }, [isConnected, account, isCorrectNetwork]);

  const handleSubscribe = async (plan) => {
    if (!isConnected) {
      connectWallet();
      return;
    }

    if (!isCorrectNetwork) {
      setTxMessage({
        type: "error",
        text: "Please switch MetaMask to the local Hardhat network before subscribing.",
      });
      return;
    }

    setProcessingPlanId(plan.id);
    setTxMessage({
      type: "pending",
      text: `Please confirm transaction in MetaMask to subscribe to ${plan.name}...`,
    });

    try {
      await subscribeToPlan(plan.id, plan.price);
      setTxMessage({
        type: "success",
        text: `Transaction confirmed! You are now subscribed to ${plan.name}.`,
      });
      await loadServicesData();
    } catch (err) {
      console.error("Subscription error:", err);
      let errMsg = err?.reason || err?.message || "Transaction failed or was rejected.";
      if (errMsg.includes("user rejected")) {
        errMsg = "Transaction was cancelled in MetaMask.";
      }
      setTxMessage({
        type: "error",
        text: errMsg,
      });
    } finally {
      setProcessingPlanId(null);
    }
  };

  const getProviderIcon = (name) => {
    const n = (name || "").toLowerCase();
    if (n.includes("spotify")) return <Music className="w-6 h-6 text-emerald-500" />;
    if (n.includes("netflix")) return <Tv className="w-6 h-6 text-rose-500" />;
    if (n.includes("prime") || n.includes("amazon")) return <ShoppingBag className="w-6 h-6 text-amber-500" />;
    if (n.includes("youtube")) return <Youtube className="w-6 h-6 text-rose-600" />;
    return <Layers className="w-6 h-6 text-indigo-500" />;
  };

  return (
    <div className="space-y-10 pb-12">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full border border-indigo-100">
          <Layers className="w-3.5 h-3.5" />
          On-Chain Demo Service Providers
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
          Services & Subscription Plans
        </h1>
        <p className="text-slate-600 text-sm sm:text-base">
          Subscribe to multiple service providers independently using your crypto wallet.
        </p>
      </div>

      {/* Transaction status alert */}
      {txMessage && (
        <div
          className={`max-w-2xl mx-auto p-4 rounded-xl text-sm font-medium flex items-center gap-3 shadow-xs border ${
            txMessage.type === "pending"
              ? "bg-indigo-50 text-indigo-800 border-indigo-200"
              : txMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          {txMessage.type === "pending" && (
            <span className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          )}
          {txMessage.type === "success" && (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          )}
          {txMessage.type === "error" && (
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          )}
          <span className="flex-1">{txMessage.text}</span>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 text-sm font-medium">Fetching service providers & plans...</p>
        </div>
      ) : services.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm max-w-xl mx-auto space-y-3">
          <Layers className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-lg font-bold text-slate-900">No Services Found</h3>
          <p className="text-slate-500 text-sm">
            No service providers have been registered on the smart contract yet.
          </p>
        </div>
      ) : (
        <div className="space-y-12">
          {services.map((service) => (
            <div key={service.id} className="space-y-6">
              {/* Provider Title Banner */}
              <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
                <div className="p-2 bg-slate-100 rounded-xl">
                  {getProviderIcon(service.name)}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">{service.name}</h2>
                  <p className="text-xs text-slate-500">{service.description}</p>
                </div>
              </div>

              {/* Plans Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {service.plans.map((plan) => {
                  const isUserSubscribedToThisPlan = activePlanIds.has(plan.id);
                  return (
                    <PlanCard
                      key={plan.id}
                      plan={plan}
                      onSubscribe={handleSubscribe}
                      isCurrentPlan={isUserSubscribedToThisPlan}
                      isUserSubActive={isUserSubscribedToThisPlan}
                      isProcessing={processingPlanId === plan.id}
                      disabled={!isCorrectNetwork && isConnected}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
