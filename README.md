# Decentralized Subscription Payment System

A clean, modern, academic-grade Decentralized Application (DApp) for managing cryptocurrency subscription payments directly on the Ethereum blockchain via Solidity smart contracts and MetaMask.

---

## Overview

The **Decentralized Subscription Payment System** allows users to subscribe to digital services by making cryptocurrency (ETH) payments directly through their MetaMask wallet. All subscription plans, active status, start dates, expiry times, and payment histories are immutably stored and managed by a Solidity smart contract deployed on an Ethereum-compatible network (Hardhat local network).

---

## Problem Statement

Traditional Web2 subscription services rely heavily on centralized payment gateways (Stripe, PayPal, Razorpay) and centralized databases (MongoDB, PostgreSQL). This model introduces single points of failure, privacy risks, high payment processing fees, and potential subscription lock-in or silent recurring billing without explicit per-transaction approval.

---

## Solution

This DApp demonstrates a pure Web3 architecture:
- **No Backend Server**: Zero Express, Node relayers, or server APIs.
- **No Traditional Database**: Zero MongoDB, Mongoose, or SQL databases. The Solidity smart contract serves as the single source of truth.
- **Wallet-Based Identity**: Users connect via MetaMask. The wallet address is their unique identity.
- **Direct Crypto Payments**: Native ETH payments sent directly to smart contract.
- **On-Chain Verification**: Anyone can verify subscription validity using the smart contract `isSubscriptionActive(address)` function.

---

## Features

- **Wallet Connection**: Connects directly to MetaMask with support for account changes, network detection, and automatic UI synchronization.
- **Subscription Plan Management**: Service provider/admin can create, update, deactivate, and reactivate subscription tiers.
- **Cryptocurrency Payments**: Users pay exact ETH values required by smart contracts.
- **Subscription Renewal**: Extend active subscriptions or reactivate expired ones with user-triggered wallet approvals.
- **Subscription Cancellation**: Users can cancel subscriptions on-chain (stops active state without automatic refunds).
- **Public Subscription Proof Verification**: Enter any Ethereum wallet address to query its subscription status and validity directly on-chain.
- **Admin Portal**: Owner-only controls for managing plans and withdrawing accumulated contract ETH funds.
- **Network Warning Banner**: Automatic detection when connected to the wrong network with one-click MetaMask network switching.

---

## Architecture

```
                React Frontend (Vite + Tailwind)
                      ↓
                MetaMask Wallet
                      ↓
                   ethers.js (v6)
                      ↓
            Solidity Smart Contract
                      ↓
                Hardhat Local Blockchain (Chain ID 31337)
```

---

## Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide React, React Router v6, ethers.js v6
- **Blockchain**: Solidity `^0.8.20`, Hardhat, ethers.js, Hardhat Local Node (`http://127.0.0.1:8545`, Chain ID `31337`)
- **Wallet**: MetaMask Browser Extension

---

## Smart Contract Functions

### Plan Management (Owner Only)
- `createPlan(string name, string description, uint256 price, uint256 duration)`: Creates a new active plan. Emits `PlanCreated`.
- `updatePlan(uint256 planId, string name, string description, uint256 price, uint256 duration)`: Updates an existing plan. Emits `PlanUpdated`.
- `deactivatePlan(uint256 planId)`: Prevents new subscriptions for a plan while preserving existing user subscriptions. Emits `PlanDeactivated`.
- `reactivatePlan(uint256 planId)`: Reactivates an inactive plan. Emits `PlanReactivated`.
- `withdrawFunds()`: Transfers contract ETH balance to the owner address using a reentrancy-safe call pattern. Emits `FundsWithdrawn`.

### Public & User Functions
- `getPlan(uint256 planId)`: Returns complete plan details by ID.
- `getTotalPlans()`: Returns total number of plans created (`planCount`).
- `subscribe(uint256 planId)`: `payable` function. Validates plan active status and exact ETH payment. Creates user subscription record. Emits `SubscriptionCreated`.
- `renewSubscription()`: `payable` function. Extends user subscription duration from current expiry (if active) or block timestamp (if expired). Emits `SubscriptionRenewed`.
- `cancelSubscription()`: Marks user subscription as inactive on-chain. Emits `SubscriptionCancelled`.
- `getMySubscription()`: Returns caller's subscription details (`subscriptions[msg.sender]`).
- `getSubscription(address subscriber)`: Returns subscription record for any given address.
- `isSubscriptionActive(address subscriber)`: Pure on-chain verification returning `true` only when subscription exists, is marked active, and `block.timestamp < expiryTime`.

---

## Subscription Lifecycle

```
[Select Plan] ──> [Connect MetaMask] ──> [Pay ETH via MetaMask]
                                                 │
                                                 ▼
[Access Period] <── [Subscription Recorded On-Chain]
       │
       ├────> [Renew] ──> [Approve ETH via MetaMask] ──> [Extended Expiry]
       │
       ├────> [Cancel] ──> [User Action On-Chain] ──> [Inactive State]
       │
       └────> [Expire] ──> [block.timestamp >= expiryTime] ──> [Expired State]
```

---

## Local Setup & Run Guide

### 1. Clone & Install Dependencies

Root folder installation:
```bash
# Install root package & dependencies
npm install

# Install blockchain dependencies
cd blockchain && npm install

# Install client dependencies
cd ../client && npm install
```

### 2. Start Hardhat Local Blockchain
In a separate terminal:
```bash
npm run blockchain
```
*This starts a local Hardhat node at `http://127.0.0.1:8545` (Chain ID `31337`) and outputs 20 funded test accounts with private keys.*

### 3. Configure MetaMask Network
Add a custom network in MetaMask:
- **Network Name**: Hardhat Local
- **RPC URL**: `http://127.0.0.1:8545`
- **Chain ID**: `31337`
- **Currency Symbol**: `ETH`

### 4. Import Hardhat Account into MetaMask
- Copy private key from Hardhat node output (e.g., Account #0: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`).
- Import into MetaMask to get 10,000 test ETH.

### 5. Compile & Deploy Smart Contract
In another terminal:
```bash
npm run compile
npm run deploy
```
*The deploy script compiles `DecentralizedSubscription.sol`, deploys it, seeds demo subscription plans (Basic, Premium, Annual Pass), and automatically exports the ABI and deployed address into `client/src/abi/DecentralizedSubscription.json`.*

### 6. Start React Frontend
```bash
npm run client
```
Open `http://localhost:3000` in your browser.

---

## Important Payment Note

This project uses **user-triggered subscription payments**. It does **NOT** perform silent, automatic recurring withdrawals from a user's crypto wallet. Because smart contracts on Ethereum cannot pull funds without explicit wallet signatures, each subscription renewal requires the user to approve a new MetaMask transaction.

---

## Testing

The project includes a comprehensive Hardhat unit test suite covering 20 test cases:

```bash
npm test
```

### Tested Scenarios:
1. Contract deployment & address verification
2. Deployer assigned as owner
3. Owner plan creation
4. `planCount` increment
5. Rejection of zero price plans
6. Rejection of zero duration plans
7. Rejection of non-owner plan creation
8. Plan info retrieval
9. Plan deactivation
10. Plan reactivation
11. Successful subscription payment matching price
12. Rejection of incorrect ETH payment amounts
13. On-chain subscription data storage
14. Subscription active status verification logic
15. Renewal extending expiry date
16. Cancellation setting `active = false`
17. Expired subscription behavior when EVM time advances
18. Rejection of non-owner fund withdrawal
19. Successful owner fund withdrawal
20. Rejection of non-owner plan updates/deactivations

---

## Security Notes

- **Zero Private Keys in Frontend**: No private keys or secret seeds are placed in frontend environment files or client code. All state-changing operations require user approval through MetaMask.
- **Access Control**: Critical plan management and fund withdrawal functions are protected by `onlyOwner` modifiers.
- **Pull over Push Withdrawals**: Owner funds are withdrawn using low-level call transfers with reentrancy protection checks.
- **Input Validation**: Price and duration must be greater than zero; non-existent plan IDs revert immediately with descriptive error messages.

---

## Future Improvements

- ERC-20 token subscription payments (e.g., USDT, USDC, DAI).
- NFT membership passes representing subscription rights.
- Off-chain email or push notifications before subscription expiration.
- Multi-tier or concurrent active subscriptions per wallet.
- Integration of Chainlink Automation or Keepers for automatic plan state transitions.
- Public testnet deployment (Sepolia, Arbitrum Sepolia).

---

## License

MIT License. Developed as an academic demonstration project.
