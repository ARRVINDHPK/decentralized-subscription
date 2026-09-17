import { formatEther, parseEther } from "ethers";

/**
 * Formats an Ethereum address into shortened display format: 0x1234...5678
 */
export function formatAddress(address) {
  if (!address || typeof address !== "string") return "";
  if (address.length < 10) return address;
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

/**
 * Formats wei (BigInt or string) into ETH string
 */
export function formatEth(wei, decimals = 4) {
  if (wei === undefined || wei === null) return "0 ETH";
  try {
    const valStr = typeof wei === "bigint" ? wei.toString() : String(wei);
    const ethVal = parseFloat(formatEther(valStr));
    return `${ethVal.toFixed(decimals).replace(/\.?0+$/, "")} ETH`;
  } catch (err) {
    return "0 ETH";
  }
}

/**
 * Parses ETH user input string into wei BigInt safely
 */
export function parseEthToWei(ethAmount) {
  if (!ethAmount || isNaN(parseFloat(ethAmount))) {
    throw new Error("Invalid ETH amount format");
  }
  return parseEther(String(ethAmount));
}

/**
 * Formats duration in seconds to human readable string (e.g. "30 Days", "1 Day")
 */
export function formatDuration(seconds) {
  const sec = Number(seconds);
  if (isNaN(sec) || sec <= 0) return "0 days";

  const days = Math.floor(sec / 86400);
  const hours = Math.floor((sec % 86400) / 3600);

  if (days >= 1) {
    return days === 1 ? "1 Day" : `${days} Days`;
  }
  if (hours >= 1) {
    return hours === 1 ? "1 Hour" : `${hours} Hours`;
  }
  return `${Math.floor(sec / 60)} Minutes`;
}

/**
 * Formats Unix timestamp (in seconds) to human date string
 */
export function formatDate(timestamp) {
  const ts = Number(timestamp);
  if (!ts || ts <= 0) return "N/A";
  const date = new Date(ts * 1000);
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Calculates remaining days/hours/minutes until expiry
 */
export function getRemainingTime(expiryTimestamp) {
  const expirySec = Number(expiryTimestamp);
  if (!expirySec || expirySec <= 0) return { expired: true, text: "Expired" };

  const nowSec = Math.floor(Date.now() / 1000);
  const diffSec = expirySec - nowSec;

  if (diffSec <= 0) {
    return { expired: true, text: "Expired" };
  }

  const days = Math.floor(diffSec / 86400);
  const hours = Math.floor((diffSec % 86400) / 3600);
  const minutes = Math.floor((diffSec % 3600) / 60);

  if (days > 0) {
    return { expired: false, text: `${days}d ${hours}h remaining` };
  }
  if (hours > 0) {
    return { expired: false, text: `${hours}h ${minutes}m remaining` };
  }
  return { expired: false, text: `${minutes}m remaining` };
}
