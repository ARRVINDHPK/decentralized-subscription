import { ethers } from "ethers";
import contractArtifact from "../abi/DecentralizedSubscription.json";

const HARDHAT_RPC_URL = import.meta.env.VITE_RPC_URL || "http://127.0.0.1:8545";
const CONTRACT_ADDRESS_OVERRIDE = import.meta.env.VITE_CONTRACT_ADDRESS;

export function getContractAddress() {
  if (CONTRACT_ADDRESS_OVERRIDE && CONTRACT_ADDRESS_OVERRIDE.trim() !== "") {
    return CONTRACT_ADDRESS_OVERRIDE.trim();
  }
  return contractArtifact.address || "";
}

export function getProvider() {
  if (window.ethereum) {
    return new ethers.BrowserProvider(window.ethereum);
  }
  return new ethers.JsonRpcProvider(HARDHAT_RPC_URL);
}

export async function getSigner() {
  if (!window.ethereum) {
    throw new Error("MetaMask wallet is not installed.");
  }
  const provider = new ethers.BrowserProvider(window.ethereum);
  return await provider.getSigner();
}

export async function getContract(useSigner = false) {
  const address = getContractAddress();
  if (!address) {
    throw new Error("Contract address not set. Please deploy contract.");
  }
  const abi = contractArtifact.abi;
  if (!abi || abi.length === 0) {
    throw new Error("Contract ABI missing.");
  }

  if (useSigner) {
    const signer = await getSigner();
    return new ethers.Contract(address, abi, signer);
  } else {
    const provider = getProvider();
    return new ethers.Contract(address, abi, provider);
  }
}

export async function getOwner() {
  const contract = await getContract(false);
  return await contract.owner();
}

/**
 * Gets all registered providers
 */
export async function getAllProviders() {
  const contract = await getContract(false);
  const total = Number(await contract.getTotalProviders());
  const providers = [];
  for (let i = 1; i <= total; i++) {
    try {
      const p = await contract.getProvider(i);
      providers.push({
        id: Number(p.id),
        owner: p.owner,
        name: p.name,
        description: p.description,
        active: p.active,
      });
    } catch (err) {
      console.error(`Failed to fetch provider #${i}`, err);
    }
  }
  return providers;
}

/**
 * Gets all plans for a specific provider
 */
export async function getProviderPlans(providerId) {
  const contract = await getContract(false);
  const rawPlans = await contract.getProviderPlans(providerId);
  return rawPlans.map((p) => ({
    id: Number(p.id),
    providerId: Number(p.providerId),
    name: p.name,
    description: p.description,
    price: p.price,
    duration: Number(p.duration),
    active: p.active,
  }));
}

/**
 * Gets all plans across all providers
 */
export async function getAllPlans() {
  const contract = await getContract(false);
  const total = Number(await contract.getTotalPlans());
  const plans = [];
  for (let i = 1; i <= total; i++) {
    try {
      const p = await contract.getPlan(i);
      plans.push({
        id: Number(p.id),
        providerId: Number(p.providerId),
        name: p.name,
        description: p.description,
        price: p.price,
        duration: Number(p.duration),
        active: p.active,
      });
    } catch (err) {
      console.error(`Failed to fetch plan #${i}`, err);
    }
  }
  return plans;
}

/**
 * Gets complete list of services (providers with their plans)
 */
export async function getAllServicesWithPlans() {
  const providers = await getAllProviders();
  const services = [];
  for (const prov of providers) {
    const plans = await getProviderPlans(prov.id);
    services.push({
      ...prov,
      plans,
    });
  }
  return services;
}

/**
 * Gets single plan details
 */
export async function getPlan(planId) {
  const contract = await getContract(false);
  const p = await contract.getPlan(planId);
  return {
    id: Number(p.id),
    providerId: Number(p.providerId),
    name: p.name,
    description: p.description,
    price: p.price,
    duration: Number(p.duration),
    active: p.active,
  };
}

/**
 * Gets single provider details
 */
export async function getProviderDetails(providerId) {
  const contract = await getContract(false);
  const p = await contract.getProvider(providerId);
  return {
    id: Number(p.id),
    owner: p.owner,
    name: p.name,
    description: p.description,
    active: p.active,
  };
}

/**
 * Creates provider
 */
export async function createProvider(name, description, providerOwner) {
  const contract = await getContract(true);
  const tx = await contract.createProvider(name, description, providerOwner || ethers.ZeroAddress);
  return await tx.wait();
}

/**
 * Creates plan under provider
 */
export async function createPlan(providerId, name, description, priceWei, durationSec) {
  const contract = await getContract(true);
  const tx = await contract.createPlan(providerId, name, description, priceWei, durationSec);
  return await tx.wait();
}

/**
 * Deactivates plan
 */
export async function deactivatePlan(planId) {
  const contract = await getContract(true);
  const tx = await contract.deactivatePlan(planId);
  return await tx.wait();
}

/**
 * Reactivates plan
 */
export async function reactivatePlan(planId) {
  const contract = await getContract(true);
  const tx = await contract.reactivatePlan(planId);
  return await tx.wait();
}

/**
 * User subscribes to specific planId by paying priceWei
 */
export async function subscribeToPlan(planId, priceWei) {
  const contract = await getContract(true);
  const tx = await contract.subscribe(planId, { value: priceWei });
  return await tx.wait();
}

/**
 * User renews subscription for specific planId by paying priceWei
 */
export async function renewUserSubscription(planId, priceWei) {
  const contract = await getContract(true);
  const tx = await contract.renewSubscription(planId, { value: priceWei });
  return await tx.wait();
}

/**
 * User cancels subscription for specific planId
 */
export async function cancelUserSubscription(planId) {
  const contract = await getContract(true);
  const tx = await contract.cancelSubscription(planId);
  return await tx.wait();
}

/**
 * Gets all subscriptions for a specific user wallet address
 */
export async function getUserSubscriptions(walletAddress) {
  if (!walletAddress || !ethers.isAddress(walletAddress)) return [];
  const contract = await getContract(false);
  const rawSubs = await contract.getUserSubscriptions(walletAddress);

  return rawSubs.map((s) => ({
    subscriptionId: Number(s.subscriptionId),
    subscriber: s.subscriber,
    providerId: Number(s.providerId),
    planId: Number(s.planId),
    startTime: Number(s.startTime),
    expiryTime: Number(s.expiryTime),
    amountPaid: s.amountPaid,
    active: s.active,
    exists: s.subscriber !== ethers.ZeroAddress,
  }));
}

/**
 * Checks if subscription to a specific planId is active
 */
export async function isSubscriptionActive(walletAddress, planId) {
  if (!walletAddress || !ethers.isAddress(walletAddress)) return false;
  const contract = await getContract(false);
  return await contract.isSubscriptionActive(walletAddress, planId);
}

/**
 * Gets contract ETH balance
 */
export async function getContractBalance() {
  const provider = getProvider();
  const address = getContractAddress();
  if (!address) return 0n;
  return await provider.getBalance(address);
}

/**
 * Master owner withdraws funds
 */
export async function withdrawFunds() {
  const contract = await getContract(true);
  const tx = await contract.withdrawFunds();
  return await tx.wait();
}

/**
 * Provider withdraws funds
 */
export async function withdrawProviderFunds(providerId) {
  const contract = await getContract(true);
  const tx = await contract.withdrawProviderFunds(providerId);
  return await tx.wait();
}
