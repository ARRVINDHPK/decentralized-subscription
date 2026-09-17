import React, { useState } from "react";
import { Search, AlertCircle, CheckCircle2, User, Music, Tv, ShoppingBag, Youtube, Layers } from "lucide-react";
import { ethers } from "ethers";
import { getUserSubscriptions, isSubscriptionActive, getPlan, getProviderDetails } from "../services/contract";
import { StatusBadge } from "../components/StatusBadge";
import { formatDate, formatEth, getRemainingTime } from "../utils/formatters";

export function Verify() {
  const [searchAddress, setSearchAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultList, setResultList] = useState(null); // Array of enriched sub items
  const [searchedAddr, setSearchedAddr] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleVerify = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setResultList(null);

    const addr = searchAddress.trim();
    if (!addr) {
      setErrorMsg("Please enter an Ethereum wallet address.");
      return;
    }

    if (!ethers.isAddress(addr)) {
      setErrorMsg("Invalid Ethereum address format.");
      return;
    }

    setLoading(true);
    setSearchedAddr(addr);

    try {
      const rawSubs = await getUserSubscriptions(addr);
      const fullList = [];

      for (const sub of rawSubs) {
        let planData = null;
        let providerData = null;

        try {
          planData = await getPlan(sub.planId);
          providerData = await getProviderDetails(sub.providerId);
        } catch (err) {
          console.warn(`Failed to fetch metadata for plan #${sub.planId}`, err);
        }

        const activeOnChain = await isSubscriptionActive(addr, sub.planId);

        let derivedStatus = "Not Subscribed";
        if (sub.exists) {
          if (!sub.active) derivedStatus = "Cancelled";
          else if (!activeOnChain) derivedStatus = "Expired";
          else derivedStatus = "Active";
        }

        fullList.push({
          ...sub,
          plan: planData,
          provider: providerData,
          activeOnChain,
          derivedStatus,
        });
      }

      setResultList(fullList);
    } catch (err) {
      console.error("Verification query error:", err);
      setErrorMsg("Failed to query smart contract. Ensure Hardhat network is active.");
    } finally {
      setLoading(false);
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

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full border border-indigo-100">
          <Search className="w-3.5 h-3.5" />
          Multi-Subscription On-Chain Verification
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
          Verify Wallet Subscriptions
        </h1>
        <p className="text-slate-600 text-sm">
          Enter any Ethereum wallet address to query all subscription records directly from the Solidity smart contract.
        </p>
      </div>

      {/* Search Input Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <form onSubmit={handleVerify} className="space-y-4">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Wallet Address to Query
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <User className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchAddress}
                onChange={(e) => setSearchAddress(e.target.value)}
                placeholder="0x71A2b3C4...9F32"
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              Verify Status
            </button>
          </div>

          {errorMsg && (
            <p className="text-xs text-rose-600 font-medium flex items-center gap-1.5 mt-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {errorMsg}
            </p>
          )}
        </form>
      </div>

      {/* Results Container */}
      {resultList !== null && (
        <div className="space-y-4 animate-fadeIn">
          <div className="bg-slate-900 text-white p-4 rounded-xl flex items-center justify-between text-xs font-mono">
            <span>Queried Target Address:</span>
            <span className="font-bold text-indigo-300 break-all">{searchedAddr}</span>
          </div>

          {resultList.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-sm space-y-2">
              <AlertCircle className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-base font-bold text-slate-800">No Subscriptions Found</h4>
              <p className="text-xs text-slate-500">
                This wallet holds zero subscription records on the smart contract.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {resultList.map((item) => (
                <div
                  key={item.planId}
                  className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 mt-1">
                      {getProviderIcon(item.provider?.name)}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-indigo-600 uppercase">
                        {item.provider?.name || `Provider #${item.providerId}`}
                      </div>
                      <h4 className="text-lg font-bold text-slate-900">
                        {item.plan?.name || `Plan #${item.planId}`}
                      </h4>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-1">
                        <span>Paid: <strong>{formatEth(item.amountPaid)}</strong></span>
                        <span>Expires: <strong>{formatDate(item.expiryTime)}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <StatusBadge status={item.derivedStatus} size="md" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
