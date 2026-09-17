const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("--------------------------------------------------");
  console.log("Deploying Multi-Subscription Smart Contract...");

  const [deployer] = await ethers.getSigners();
  console.log(`Deployer address: ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Deployer ETH balance: ${ethers.formatEther(balance)} ETH`);

  const Factory = await ethers.getContractFactory("DecentralizedSubscription");
  const contract = await Factory.deploy();
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  console.log(`DecentralizedSubscription deployed to: ${contractAddress}`);
  console.log(`Contract Master Owner: ${await contract.owner()}`);

  console.log("\nSeeding Demo Service Providers & Plans...");
  const ONE_DAY = 24 * 60 * 60;

  // Provider 1: Spotify
  let tx = await contract.createProvider(
    "Spotify",
    "On-demand digital music, podcast, and audio streaming service.",
    deployer.address
  );
  await tx.wait();
  console.log("Registered Provider 1: Spotify");

  tx = await contract.createPlan(
    1,
    "Individual",
    "Stream millions of ad-free songs on 1 account.",
    ethers.parseEther("0.002"),
    30 * ONE_DAY
  ); // Plan #1
  await tx.wait();
  console.log("  Created Plan 1: Spotify Individual (0.002 ETH / 30 Days)");

  tx = await contract.createPlan(
    1,
    "Family Pass",
    "6 Premium accounts for family members under one roof.",
    ethers.parseEther("0.003"),
    30 * ONE_DAY
  ); // Plan #2
  await tx.wait();
  console.log("  Created Plan 2: Spotify Family Pass (0.003 ETH / 30 Days)");

  // Provider 2: Netflix
  tx = await contract.createProvider(
    "Netflix",
    "Stream movies, TV shows, and original series in high definition.",
    deployer.address
  );
  await tx.wait();
  console.log("\nRegistered Provider 2: Netflix");

  tx = await contract.createPlan(
    2,
    "Standard",
    "1080p HD streaming on up to 2 supported devices simultaneously.",
    ethers.parseEther("0.004"),
    30 * ONE_DAY
  ); // Plan #3
  await tx.wait();
  console.log("  Created Plan 3: Netflix Standard (0.004 ETH / 30 Days)");

  tx = await contract.createPlan(
    2,
    "Premium 4K",
    "4K Ultra HD + HDR streaming on up to 4 supported devices simultaneously.",
    ethers.parseEther("0.006"),
    30 * ONE_DAY
  ); // Plan #4
  await tx.wait();
  console.log("  Created Plan 4: Netflix Premium 4K (0.006 ETH / 30 Days)");

  // Provider 3: Amazon Prime
  tx = await contract.createProvider(
    "Amazon Prime",
    "Fast delivery, Prime Video, Prime Music, and exclusive shopping deals.",
    deployer.address
  );
  await tx.wait();
  console.log("\nRegistered Provider 3: Amazon Prime");

  tx = await contract.createPlan(
    3,
    "Monthly Pass",
    "Full Amazon Prime access billed month-to-month.",
    ethers.parseEther("0.003"),
    30 * ONE_DAY
  ); // Plan #5
  await tx.wait();
  console.log("  Created Plan 5: Amazon Prime Monthly Pass (0.003 ETH / 30 Days)");

  tx = await contract.createPlan(
    3,
    "Annual Pass",
    "Full year of Amazon Prime benefits with discounted annual rate.",
    ethers.parseEther("0.025"),
    365 * ONE_DAY
  ); // Plan #6
  await tx.wait();
  console.log("  Created Plan 6: Amazon Prime Annual Pass (0.025 ETH / 365 Days)");

  // Provider 4: YouTube Premium
  tx = await contract.createProvider(
    "YouTube Premium",
    "Ad-free YouTube videos, background playback, and YouTube Music Premium.",
    deployer.address
  );
  await tx.wait();
  console.log("\nRegistered Provider 4: YouTube Premium");

  tx = await contract.createPlan(
    4,
    "Individual",
    "Ad-free video playback and YouTube Music Premium for 1 user.",
    ethers.parseEther("0.003"),
    30 * ONE_DAY
  ); // Plan #7
  await tx.wait();
  console.log("  Created Plan 7: YouTube Premium Individual (0.003 ETH / 30 Days)");

  // Export artifact to client
  const artifactPath = path.join(
    __dirname,
    "../artifacts/contracts/DecentralizedSubscription.sol/DecentralizedSubscription.json"
  );

  if (fs.existsSync(artifactPath)) {
    const rawArtifact = fs.readFileSync(artifactPath, "utf8");
    const parsedArtifact = JSON.parse(rawArtifact);

    const clientAbiDir = path.join(__dirname, "../../client/src/abi");
    if (!fs.existsSync(clientAbiDir)) {
      fs.mkdirSync(clientAbiDir, { recursive: true });
    }

    const exportedData = {
      address: contractAddress,
      chainId: 31337,
      abi: parsedArtifact.abi,
    };

    fs.writeFileSync(
      path.join(clientAbiDir, "DecentralizedSubscription.json"),
      JSON.stringify(exportedData, null, 2)
    );
    console.log(`\nExported ABI and contract address to client/src/abi/DecentralizedSubscription.json`);
  } else {
    console.warn("Artifact file not found. Ensure contract is compiled before deployment.");
  }

  console.log("--------------------------------------------------");
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
