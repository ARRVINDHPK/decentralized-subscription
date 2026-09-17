import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Wallet, ShieldCheck, Layers, ArrowRight, Zap, RefreshCw, Cpu, Clock, AlertTriangle } from "lucide-react";
import { useWallet } from "../hooks/useWallet";
import { getUserSubscriptions, getAllProviders, isSubscriptionActive } from "../services/contract";
import { StatusBadge } from "../components/StatusBadge";
import { formatEth, formatDate } from "../utils/formatters";

export function Dashboard() {
  const { account, isConnected, connectWallet, isCorrectNetwork } = useWallet();
  const [providersCount, setProvidersCount] = useState(0);
  const [userSubs, setUserSubs] = useState([]);
  const [activeCount, setActiveCount] = useState(0);
  const [expiringSoonCount, setExpiringSoonCount] = useState(0);
  const [totalEthCommitted, setTotalEthCommitted] = useState(0n);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const provs = await getAllProviders();
        setProvidersCount(provs.length);

        if (isConnected && account && isCorrectNetwork) {
          const subs = await getUserSubscriptions(account);
          setUserSubs(subs);

          let activeCounter = 0;
          let expiringCounter = 0;
          let committedWei = 0n;

          const nowSec = Math.floor(Date.now() / 1000);
          const sevenDaysSec = 7 * 24 * 60 * 60;

          for (const s of subs) {
            committedWei += s.amountPaid;
            const active = await isSubscriptionActive(account, s.planId);
            if (active) {
              activeCounter++;
              if (s.expiryTime > nowSec && s.expiryTime - nowSec < sevenDaysSec) {
                expiringCounter++;
              }
            }
          }

          setActiveCount(activeCounter);
          setExpiringSoonCount(expiringCounter);
          setTotalEthCommitted(committedWei);
        }
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [isConnected, account, isCorrectNetwork]);

  return (
    <div className="space-y-10 pb-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-8 sm:p-12 shadow-2xl border border-indigo-800/50">
        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-400/30">
            <Zap className="w-3.5 h-3.5 text-indigo-400" />
            Personal Subscription Wallet & Manager
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            Manage your decentralized subscriptions from a single wallet.
          </h1>

          <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
            One wallet → multiple services → multiple independent subscriptions. Pay once per period, monitor expiration timers, and trigger renewals on-chain with full transparency.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4">
            <Link
              to="/plans"
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-500/30 transition-all hover:translate-y-[-1px]"
            >
              Browse Services & Plans
              <ArrowRight className="w-4 h-4" />
            </Link>

            {!isConnected ? (
              <button
                onClick={connectWallet}
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-sm rounded-xl backdrop-blur-sm transition-all border border-white/20"
              >
                <Wallet className="w-4 h-4" />
                Connect MetaMask
              </button>
            ) : (
              <Link
                to="/my-subscription"
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-sm rounded-xl backdrop-blur-sm transition-all border border-white/20"
              >
                <ShieldCheck className="w-4 h-4" />
                My Subscriptions ({userSubs.length})
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">{userSubs.length}</div>
            <div className="text-xs text-slate-500 font-medium">Total Subscriptions</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-emerald-600">{activeCount}</div>
            <div className="text-xs text-slate-500 font-medium">Active Subscriptions</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-amber-600">{expiringSoonCount}</div>
            <div className="text-xs text-slate-500 font-medium">Expiring Soon</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-bold text-slate-900">{formatEth(totalEthCommitted, 3)}</div>
            <div className="text-xs text-slate-500 font-medium">ETH Committed</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-slate-100 text-slate-700 rounded-xl">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">{providersCount}</div>
            <div className="text-xs text-slate-500 font-medium">Service Providers</div>
          </div>
        </div>
      </div>

      {/* Overview Box */}
      <section className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm space-y-6">
        <h2 className="text-xl font-bold text-slate-900">Personal Subscription Wallet Concept</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">1</div>
            <h4 className="font-bold text-slate-900 text-sm">Spotify Premium</h4>
            <p className="text-xs text-slate-600">Subscribed independently via MetaMask on-chain payment.</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">2</div>
            <h4 className="font-bold text-slate-900 text-sm">Netflix Standard</h4>
            <p className="text-xs text-slate-600">Simultaneously active without affecting Spotify expiry.</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">3</div>
            <h4 className="font-bold text-slate-900 text-sm">Amazon Prime</h4>
            <p className="text-xs text-slate-600">Renew or cancel Prime independently at any time.</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">4</div>
            <h4 className="font-bold text-slate-900 text-sm">YouTube Premium</h4>
            <p className="text-xs text-slate-600">Allows expiration without impacting active subscriptions.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
