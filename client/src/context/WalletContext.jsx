import React, { createContext, useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { getOwner, getContractAddress } from "../services/contract";

export const WalletContext = createContext(null);

const TARGET_CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID) || 31337;
const TARGET_CHAIN_HEX = `0x${TARGET_CHAIN_ID.toString(16)}`;

export function WalletProvider({ children }) {
  const [account, setAccount] = useState("");
  const [balance, setBalance] = useState("0");
  const [chainId, setChainId] = useState(null);
  const [contractOwner, setContractOwner] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState(false);

  // Check if MetaMask is installed
  useEffect(() => {
    setIsMetaMaskInstalled(typeof window.ethereum !== "undefined");
  }, []);

  // Fetch contract owner
  const fetchContractOwner = useCallback(async () => {
    try {
      const address = getContractAddress();
      if (address) {
        const ownerAddr = await getOwner();
        setContractOwner(ownerAddr);
      }
    } catch (err) {
      console.warn("Could not fetch contract owner:", err.message);
    }
  }, []);

  // Update account balance
  const updateBalance = useCallback(async (userAddress) => {
    if (!userAddress || !window.ethereum) return;
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const balWei = await provider.getBalance(userAddress);
      setBalance(ethers.formatEther(balWei));
    } catch (err) {
      console.error("Error fetching balance:", err);
    }
  }, []);

  // Fetch network details
  const updateNetwork = useCallback(async () => {
    if (!window.ethereum) return;
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      setChainId(Number(network.chainId));
    } catch (err) {
      console.error("Error fetching chain ID:", err);
    }
  }, []);

  // Connect Wallet handler
  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("MetaMask is required to make subscription payments. Please install MetaMask browser extension.");
      return;
    }
    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      if (accounts.length > 0) {
        const selectedAcc = accounts[0];
        setAccount(selectedAcc);
        await updateBalance(selectedAcc);
        await updateNetwork();
        await fetchContractOwner();
      }
    } catch (err) {
      console.error("Failed to connect wallet:", err);
    }
  };

  // Disconnect handler
  const disconnectWallet = () => {
    setAccount("");
    setBalance("0");
  };

  // Switch to Hardhat local network in MetaMask
  const switchNetwork = async () => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: TARGET_CHAIN_HEX }],
      });
    } catch (switchError) {
      // Unrecognized chain (4902)
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: TARGET_CHAIN_HEX,
                chainName: "Hardhat Local",
                rpcUrls: ["http://127.0.0.1:8545"],
                nativeCurrency: {
                  name: "Ethereum",
                  symbol: "ETH",
                  decimals: 18,
                },
              },
            ],
          });
        } catch (addError) {
          console.error("Failed to add Hardhat network to MetaMask:", addError);
        }
      } else {
        console.error("Failed to switch network:", switchError);
      }
    }
  };

  // Check if connected on load
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await fetchContractOwner();
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({
            method: "eth_accounts",
          });
          if (accounts.length > 0) {
            setAccount(accounts[0]);
            await updateBalance(accounts[0]);
          }
          await updateNetwork();
        } catch (err) {
          console.error("Init wallet check failed:", err);
        }
      }
      setIsLoading(false);
    };
    init();
  }, [fetchContractOwner, updateBalance, updateNetwork]);

  // MetaMask event listeners
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = async (accounts) => {
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        await updateBalance(accounts[0]);
      } else {
        setAccount("");
        setBalance("0");
      }
    };

    const handleChainChanged = () => {
      window.location.reload();
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      if (window.ethereum.removeListener) {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
        window.ethereum.removeListener("chainChanged", handleChainChanged);
      }
    };
  }, [updateBalance]);

  const isConnected = !!account;
  const isOwner =
    account && contractOwner
      ? account.toLowerCase() === contractOwner.toLowerCase()
      : false;
  const isCorrectNetwork = chainId === TARGET_CHAIN_ID;

  return (
    <WalletContext.Provider
      value={{
        account,
        balance,
        chainId,
        targetChainId: TARGET_CHAIN_ID,
        contractOwner,
        isConnected,
        isOwner,
        isCorrectNetwork,
        isMetaMaskInstalled,
        isLoading,
        connectWallet,
        disconnectWallet,
        switchNetwork,
        refreshBalance: () => updateBalance(account),
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}
