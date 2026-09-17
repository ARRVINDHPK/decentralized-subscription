import React, { useEffect, useState } from "react";
import { ShieldAlert, PlusCircle, Power, RefreshCw, Download, Layers, AlertTriangle, CheckCircle2, Building2 } from "lucide-react";
import { parseEther } from "ethers";
import { useWallet } from "../hooks/useWallet";
import {
  getAllServicesWithPlans,
  createProvider,
  createPlan,
  deactivatePlan,
  reactivatePlan,
  getContractBalance,
  withdrawFunds,
  withdrawProviderFunds,
} from "../services/contract";
import { ConfirmModal } from "../components/ConfirmModal";
import { formatEth, formatDuration } from "../utils/formatters";

export function Admin() {
  const { isConnected, isOwner, account, contractOwner, isCorrectNetwork } = useWallet();

  const [services, setServices] = useState([]);
  const [contractBal, setContractBal] = useState(0n);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  // Form state for provider creation
  const [newProvName, setNewProvName] = useState("");
  const [newProvDesc, setNewProvDesc] = useState("");
  const [newProvOwner, setNewProvOwner] = useState("");

  // Form state for plan creation
  const [selectedProvId, setSelectedProvId] = useState("");
  const [newPlanName, setNewPlanName] = useState("");
  const [newPlanDesc, setNewPlanDesc] = useState("");
  const [newPlanPriceEth, setNewPlanPriceEth] = useState("");
  const [newPlanDurationDays, setNewPlanDurationDays] = useState("");

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    actionType: null, // 'deactivate' | 'withdrawMaster' | 'withdrawProvider'
    targetId: null,
  });

  const loadAdminData = async () => {
    if (!isOwner || !isCorrectNetwork) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await getAllServicesWithPlans();
      setServices(data);
      if (data.length > 0) setSelectedProvId(String(data[0].id));
      const bal = await getContractBalance();
      setContractBal(bal);
    } catch (err) {
      console.error("Admin load error:", err);
      setStatusMsg({ type: "error", text: "Failed to load admin data from contract." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [isOwner, isCorrectNetwork]);

  const handleCreateProvider = async (e) => {
    e.preventDefault();
    setStatusMsg(null);

    if (!newProvName.trim()) {
      setStatusMsg({ type: "error", text: "Provider name cannot be empty." });
      return;
    }

    setProcessing(true);
    setStatusMsg({ type: "pending", text: "Confirming provider registration in MetaMask..." });

    try {
      await createProvider(newProvName.trim(), newProvDesc.trim(), newProvOwner.trim() || account);
      setStatusMsg({ type: "success", text: `Registered provider "${newProvName}"!` });
      setNewProvName("");
      setNewProvDesc("");
      setNewProvOwner("");
      await loadAdminData();
    } catch (err) {
      console.error("Create provider failed:", err);
      setStatusMsg({ type: "error", text: err?.reason || err?.message || "Failed to create provider." });
    } finally {
      setProcessing(false);
    }
  };

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    setStatusMsg(null);

    const provId = parseInt(selectedProvId);
    if (!provId || isNaN(provId)) {
      setStatusMsg({ type: "error", text: "Select a valid provider." });
      return;
    }
    if (!newPlanName.trim()) {
      setStatusMsg({ type: "error", text: "Plan name cannot be empty." });
      return;
    }
    const priceNum = parseFloat(newPlanPriceEth);
    if (isNaN(priceNum) || priceNum <= 0) {
      setStatusMsg({ type: "error", text: "Price must be positive ETH." });
      return;
    }
    const daysNum = parseInt(newPlanDurationDays);
    if (isNaN(daysNum) || daysNum <= 0) {
      setStatusMsg({ type: "error", text: "Duration must be positive days." });
      return;
    }

    setProcessing(true);
    setStatusMsg({ type: "pending", text: "Confirming plan creation in MetaMask..." });

    try {
      const priceWei = parseEther(newPlanPriceEth);
      const durationSec = BigInt(daysNum * 86400);

      await createPlan(provId, newPlanName.trim(), newPlanDesc.trim(), priceWei, durationSec);
      setStatusMsg({ type: "success", text: `Successfully created plan "${newPlanName}"!` });

      setNewPlanName("");
      setNewPlanDesc("");
      setNewPlanPriceEth("");
      setNewPlanDurationDays("");
      await loadAdminData();
    } catch (err) {
      console.error("Create plan failed:", err);
      setStatusMsg({ type: "error", text: err?.reason || err?.message || "Failed to create plan." });
    } finally {
      setProcessing(false);
    }
  };

  const handleToggleActive = async (plan) => {
    if (plan.active) {
      setConfirmModal({
        isOpen: true,
        title: `Deactivate ${plan.name}?`,
        message: "Deactivating this plan will prevent new subscriptions while preserving existing active subscriptions.",
        actionType: "deactivate",
        targetId: plan.id,
      });
    } else {
      setProcessing(true);
      setStatusMsg({ type: "pending", text: `Reactivating plan #${plan.id}...` });
      try {
        await reactivatePlan(plan.id);
        setStatusMsg({ type: "success", text: `Plan #${plan.id} reactivated.` });
        await loadAdminData();
      } catch (err) {
        console.error("Reactivate error:", err);
        setStatusMsg({ type: "error", text: err?.reason || err?.message || "Reactivation failed." });
      } finally {
        setProcessing(false);
      }
    }
  };

  const handleModalConfirm = async () => {
    const { actionType, targetId } = confirmModal;
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    setProcessing(true);

    try {
      if (actionType === "deactivate") {
        await deactivatePlan(targetId);
        setStatusMsg({ type: "success", text: `Plan #${targetId} deactivated.` });
      } else if (actionType === "withdrawMaster") {
        await withdrawFunds();
        setStatusMsg({ type: "success", text: "Master contract funds withdrawn!" });
      } else if (actionType === "withdrawProvider") {
        await withdrawProviderFunds(targetId);
        setStatusMsg({ type: "success", text: `Provider #${targetId} funds withdrawn!` });
      }
      await loadAdminData();
    } catch (err) {
      console.error("Action failed:", err);
      setStatusMsg({ type: "error", text: err?.reason || err?.message || "Action failed." });
    } finally {
      setProcessing(false);
    }
  };

  if (!isConnected || !isOwner) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center space-y-6">
        <div className="p-4 bg-rose-50 text-rose-600 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Access Denied: Owner Only</h2>
        <p className="text-slate-600 text-sm leading-relaxed">
          The Admin Portal is restricted to the smart contract master owner address.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full border border-indigo-100 mb-2">
            <ShieldAlert className="w-3.5 h-3.5" />
            Master & Provider Management Portal
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900">Admin Portal</h1>
        </div>

        <button
          onClick={loadAdminData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors shadow-xs self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Data
        </button>
      </div>

      {/* Status toast */}
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

      {/* Contract Balance Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-6 sm:p-8 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">Total Contract ETH Balance</span>
          <div className="text-3xl sm:text-4xl font-extrabold mt-1">{formatEth(contractBal, 4)}</div>
          <p className="text-xs text-slate-400 mt-1">Accumulated payments across all service providers.</p>
        </div>

        <button
          onClick={() =>
            setConfirmModal({
              isOpen: true,
              title: "Withdraw Master Contract Balance?",
              message: `Withdraw ${formatEth(contractBal)} to master owner address (${account})?`,
              actionType: "withdrawMaster",
              targetId: null,
            })
          }
          disabled={processing || contractBal === 0n}
          className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Withdraw Master Balance
        </button>
      </div>

      {/* Register Provider Form */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
          <Building2 className="w-5 h-5 text-indigo-600" />
          <h2 className="text-xl font-bold text-slate-900">Register Service Provider</h2>
        </div>

        <form onSubmit={handleCreateProvider} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Provider Name
              </label>
              <input
                type="text"
                value={newProvName}
                onChange={(e) => setNewProvName(e.target.value)}
                placeholder="e.g. Disney+"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Description
              </label>
              <input
                type="text"
                value={newProvDesc}
                onChange={(e) => setNewProvDesc(e.target.value)}
                placeholder="Streaming service"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Provider Owner Address
              </label>
              <input
                type="text"
                value={newProvOwner}
                onChange={(e) => setNewProvOwner(e.target.value)}
                placeholder="0x... (Optional, defaults to caller)"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:bg-white"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={processing}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              Register Provider
            </button>
          </div>
        </form>
      </div>

      {/* Create Plan Form */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
          <PlusCircle className="w-5 h-5 text-indigo-600" />
          <h2 className="text-xl font-bold text-slate-900">Create Plan under Provider</h2>
        </div>

        <form onSubmit={handleCreatePlan} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Target Service Provider
              </label>
              <select
                value={selectedProvId}
                onChange={(e) => setSelectedProvId(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white font-semibold"
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    #{s.id} - {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Plan Name
              </label>
              <input
                type="text"
                value={newPlanName}
                onChange={(e) => setNewPlanName(e.target.value)}
                placeholder="e.g. VIP Pass"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Price (ETH)
              </label>
              <input
                type="number"
                step="0.001"
                value={newPlanPriceEth}
                onChange={(e) => setNewPlanPriceEth(e.target.value)}
                placeholder="e.g. 0.005"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Duration (Days)
              </label>
              <input
                type="number"
                value={newPlanDurationDays}
                onChange={(e) => setNewPlanDurationDays(e.target.value)}
                placeholder="e.g. 30"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Description
              </label>
              <input
                type="text"
                value={newPlanDesc}
                onChange={(e) => setNewPlanDesc(e.target.value)}
                placeholder="Feature overview"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={processing}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              Create Plan on Smart Contract
            </button>
          </div>
        </form>
      </div>

      {/* Existing Providers & Plans Table */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-bold text-slate-900">All Registered Services & Plans</h2>
          </div>
        </div>

        {services.map((service) => (
          <div key={service.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-indigo-600 uppercase">Provider #{service.id}</span>
                <h3 className="text-lg font-bold text-slate-900">{service.name}</h3>
              </div>
              <button
                onClick={() =>
                  setConfirmModal({
                    isOpen: true,
                    title: `Withdraw Funds for ${service.name}?`,
                    message: `Withdraw ETH funds accumulated for ${service.name}?`,
                    actionType: "withdrawProvider",
                    targetId: service.id,
                  })
                }
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs rounded-lg border border-emerald-200 transition-colors flex items-center gap-1"
              >
                <Download className="w-3 h-3" />
                Withdraw Provider Funds
              </button>
            </div>

            <div className="overflow-x-auto bg-white rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 font-semibold uppercase">
                  <tr>
                    <th className="px-3 py-2">Plan ID</th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Price</th>
                    <th className="px-3 py-2">Duration</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {service.plans.map((p) => (
                    <tr key={p.id}>
                      <td className="px-3 py-2 font-mono">#{p.id}</td>
                      <td className="px-3 py-2 font-bold text-slate-900">{p.name}</td>
                      <td className="px-3 py-2">{formatEth(p.price)}</td>
                      <td className="px-3 py-2">{formatDuration(p.duration)}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${p.active ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"}`}>
                          {p.active ? "Active" : "Deactivated"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => handleToggleActive(p)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-semibold text-[11px]"
                        >
                          {p.active ? "Deactivate" : "Reactivate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="Confirm"
        confirmVariant="danger"
        isLoading={processing}
        onConfirm={handleModalConfirm}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
