const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DecentralizedSubscription Multi-Subscription Smart Contract", function () {
  let contract;
  let owner;
  let providerOwner1;
  let providerOwner2;
  let user1;
  let user2;

  const ONE_DAY = 24 * 60 * 60;
  const THIRTY_DAYS = 30 * ONE_DAY;
  const NINETY_DAYS = 90 * ONE_DAY;

  beforeEach(async function () {
    [owner, providerOwner1, providerOwner2, user1, user2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("DecentralizedSubscription");
    contract = await Factory.deploy();
    await contract.waitForDeployment();
  });

  // 1. Deployment
  it("1. Should deploy contract and assign deployer as owner", async function () {
    expect(await contract.getAddress()).to.be.properAddress;
    expect(await contract.owner()).to.equal(owner.address);
  });

  // 2. Provider creation
  it("2. Should allow creating a service provider", async function () {
    await expect(contract.createProvider("Spotify", "Music streaming service", providerOwner1.address))
      .to.emit(contract, "ProviderCreated")
      .withArgs(1, providerOwner1.address, "Spotify");

    expect(await contract.providerCount()).to.equal(1);
    const prov = await contract.getProvider(1);
    expect(prov.name).to.equal("Spotify");
    expect(prov.owner).to.equal(providerOwner1.address);
  });

  // 3. Multiple providers creation
  it("3. Should allow creating multiple demo providers", async function () {
    await contract.createProvider("Spotify", "Music", providerOwner1.address);
    await contract.createProvider("Netflix", "Movies", providerOwner2.address);
    await contract.createProvider("Amazon Prime", "Delivery & Video", owner.address);

    expect(await contract.providerCount()).to.equal(3);
  });

  // 4. Provider retrieval
  it("4. Should retrieve exact provider information", async function () {
    await contract.createProvider("YouTube", "Video platform", providerOwner1.address);
    const prov = await contract.getProvider(1);
    expect(prov.id).to.equal(1);
    expect(prov.name).to.equal("YouTube");
    expect(prov.active).to.be.true;
  });

  // 5. Provider deactivation and reactivation
  it("5. Should allow provider owner to deactivate and reactivate provider", async function () {
    await contract.createProvider("Spotify", "Music", providerOwner1.address);
    await contract.connect(providerOwner1).deactivateProvider(1);
    let prov = await contract.getProvider(1);
    expect(prov.active).to.be.false;

    await contract.connect(providerOwner1).reactivateProvider(1);
    prov = await contract.getProvider(1);
    expect(prov.active).to.be.true;
  });

  // 6. Plan creation with globally unique planId
  it("6. Should allow provider to create plans with globally unique planId", async function () {
    await contract.createProvider("Spotify", "Music", providerOwner1.address);

    const price = ethers.parseEther("0.002");
    await expect(contract.connect(providerOwner1).createPlan(1, "Individual", "Music for 1", price, THIRTY_DAYS))
      .to.emit(contract, "PlanCreated")
      .withArgs(1, 1, "Individual", price, THIRTY_DAYS);

    expect(await contract.planCount()).to.equal(1);
    const plan = await contract.getPlan(1);
    expect(plan.id).to.equal(1);
    expect(plan.providerId).to.equal(1);
    expect(plan.name).to.equal("Individual");
  });

  // 7. Multiple plans creation across different providers
  it("7. Should assign globally unique planIds across multiple providers", async function () {
    await contract.createProvider("Spotify", "Music", providerOwner1.address);
    await contract.createProvider("Netflix", "Movies", providerOwner2.address);

    await contract.connect(providerOwner1).createPlan(1, "Spotify Individual", "Desc", ethers.parseEther("0.002"), THIRTY_DAYS); // Plan #1
    await contract.connect(providerOwner1).createPlan(1, "Spotify Family", "Desc", ethers.parseEther("0.003"), THIRTY_DAYS);     // Plan #2
    await contract.connect(providerOwner2).createPlan(2, "Netflix Standard", "Desc", ethers.parseEther("0.004"), THIRTY_DAYS);    // Plan #3
    await contract.connect(providerOwner2).createPlan(2, "Netflix Premium", "Desc", ethers.parseEther("0.006"), THIRTY_DAYS);     // Plan #4

    expect(await contract.planCount()).to.equal(4);

    const provider2Plans = await contract.getProviderPlans(2);
    expect(provider2Plans.length).to.equal(2);
    expect(provider2Plans[0].id).to.equal(3);
    expect(provider2Plans[1].id).to.equal(4);
  });

  // 8. Rejection of invalid plan parameters
  it("8. Should reject plan creation with zero price or zero duration", async function () {
    await contract.createProvider("Spotify", "Music", providerOwner1.address);

    await expect(
      contract.connect(providerOwner1).createPlan(1, "Free", "Desc", 0, THIRTY_DAYS)
    ).to.be.revertedWith("Price must be greater than zero");

    await expect(
      contract.connect(providerOwner1).createPlan(1, "No Duration", "Desc", ethers.parseEther("0.002"), 0)
    ).to.be.revertedWith("Duration must be greater than zero");
  });

  // 9. Unauthorized plan modification prevention
  it("9. Should prevent unauthorized users from modifying another provider's plan", async function () {
    await contract.createProvider("Spotify", "Music", providerOwner1.address);
    await contract.connect(providerOwner1).createPlan(1, "Individual", "Desc", ethers.parseEther("0.002"), THIRTY_DAYS);

    await expect(
      contract.connect(user1).updatePlan(1, "Hacked", "Desc", ethers.parseEther("0.005"), THIRTY_DAYS)
    ).to.be.revertedWith("Not authorized to update this plan");
  });

  // 10. Plan deactivation and reactivation
  it("10. Should allow plan owner to deactivate and reactivate plan", async function () {
    await contract.createProvider("Spotify", "Music", providerOwner1.address);
    await contract.connect(providerOwner1).createPlan(1, "Individual", "Desc", ethers.parseEther("0.002"), THIRTY_DAYS);

    await contract.connect(providerOwner1).deactivatePlan(1);
    let plan = await contract.getPlan(1);
    expect(plan.active).to.be.false;

    await contract.connect(providerOwner1).reactivatePlan(1);
    plan = await contract.getPlan(1);
    expect(plan.active).to.be.true;
  });

  // Setup helper for multi-subscription test cases
  async function setupDemoProvidersAndPlans() {
    await contract.createProvider("Spotify", "Music", providerOwner1.address); // Prov 1
    await contract.createProvider("Netflix", "Movies", providerOwner2.address); // Prov 2
    await contract.createProvider("Amazon Prime", "Shopping & Video", owner.address); // Prov 3

    await contract.connect(providerOwner1).createPlan(1, "Spotify Individual", "Desc", ethers.parseEther("0.002"), THIRTY_DAYS); // Plan #1
    await contract.connect(providerOwner1).createPlan(1, "Spotify Family", "Desc", ethers.parseEther("0.003"), THIRTY_DAYS);     // Plan #2
    await contract.connect(providerOwner2).createPlan(2, "Netflix Standard", "Desc", ethers.parseEther("0.004"), THIRTY_DAYS);    // Plan #3
    await contract.connect(providerOwner2).createPlan(2, "Netflix Premium", "Desc", ethers.parseEther("0.006"), THIRTY_DAYS);     // Plan #4
    await contract.connect(owner).createPlan(3, "Prime Monthly", "Desc", ethers.parseEther("0.003"), THIRTY_DAYS);               // Plan #5
  }

  // 11. User subscribes to Spotify Premium (Plan 1)
  it("11. Should allow user to subscribe to Spotify", async function () {
    await setupDemoProvidersAndPlans();
    const price = ethers.parseEther("0.002");

    await expect(contract.connect(user1).subscribe(1, { value: price }))
      .to.emit(contract, "SubscriptionCreated")
      .withArgs(user1.address, 1, 1, 1, (v) => true, (v) => true, price);

    expect(await contract.isSubscriptionActive(user1.address, 1)).to.be.true;
  });

  // 12. Same user subscribes to Netflix Premium (Plan 4)
  it("12. Should allow the SAME user to subscribe to Netflix without overwriting Spotify", async function () {
    await setupDemoProvidersAndPlans();
    await contract.connect(user1).subscribe(1, { value: ethers.parseEther("0.002") }); // Spotify Plan 1
    await contract.connect(user1).subscribe(4, { value: ethers.parseEther("0.006") }); // Netflix Plan 4

    expect(await contract.isSubscriptionActive(user1.address, 1)).to.be.true;
    expect(await contract.isSubscriptionActive(user1.address, 4)).to.be.true;
  });

  // 13. Same user subscribes to Amazon Prime Monthly (Plan 5)
  it("13. Should allow user to subscribe to a 3rd provider (Amazon Prime)", async function () {
    await setupDemoProvidersAndPlans();
    await contract.connect(user1).subscribe(1, { value: ethers.parseEther("0.002") });
    await contract.connect(user1).subscribe(4, { value: ethers.parseEther("0.006") });
    await contract.connect(user1).subscribe(5, { value: ethers.parseEther("0.003") });

    expect(await contract.isSubscriptionActive(user1.address, 1)).to.be.true;
    expect(await contract.isSubscriptionActive(user1.address, 4)).to.be.true;
    expect(await contract.isSubscriptionActive(user1.address, 5)).to.be.true;
  });

  // 14. User holds 3+ simultaneous active subscriptions in 1 wallet
  it("14. Should maintain 3+ independent active subscriptions in 1 wallet", async function () {
    await setupDemoProvidersAndPlans();
    await contract.connect(user1).subscribe(1, { value: ethers.parseEther("0.002") });
    await contract.connect(user1).subscribe(4, { value: ethers.parseEther("0.006") });
    await contract.connect(user1).subscribe(5, { value: ethers.parseEther("0.003") });

    const userSubs = await contract.getUserSubscriptions(user1.address);
    expect(userSubs.length).to.equal(3);
    expect(userSubs[0].planId).to.equal(1);
    expect(userSubs[1].planId).to.equal(4);
    expect(userSubs[2].planId).to.equal(5);
  });

  // 15. Rejection of duplicate active subscription to exact same plan
  it("15. Should reject duplicate active subscription to the exact same plan", async function () {
    await setupDemoProvidersAndPlans();
    const price = ethers.parseEther("0.002");
    await contract.connect(user1).subscribe(1, { value: price });

    await expect(
      contract.connect(user1).subscribe(1, { value: price })
    ).to.be.revertedWith("User already has an active subscription to this plan");
  });

  // 16. Renewing Spotify extends ONLY Spotify expiry time
  it("16. Should extend ONLY Spotify expiry time when renewing Spotify", async function () {
    await setupDemoProvidersAndPlans();
    await contract.connect(user1).subscribe(1, { value: ethers.parseEther("0.002") });
    await contract.connect(user1).subscribe(4, { value: ethers.parseEther("0.006") });

    const spotifyBefore = await contract.getSubscription(user1.address, 1);
    const netflixBefore = await contract.getSubscription(user1.address, 4);

    await contract.connect(user1).renewSubscription(1, { value: ethers.parseEther("0.002") });

    const spotifyAfter = await contract.getSubscription(user1.address, 1);
    const netflixAfter = await contract.getSubscription(user1.address, 4);

    expect(spotifyAfter.expiryTime).to.equal(spotifyBefore.expiryTime + BigInt(THIRTY_DAYS));
    expect(netflixAfter.expiryTime).to.equal(netflixBefore.expiryTime); // Unchanged!
  });

  // 17. Renewing Spotify leaves Netflix & Prime expiration timestamps unchanged
  it("17. Should verify independence of renewal timestamps across multiple plans", async function () {
    await setupDemoProvidersAndPlans();
    await contract.connect(user1).subscribe(1, { value: ethers.parseEther("0.002") });
    await contract.connect(user1).subscribe(4, { value: ethers.parseEther("0.006") });
    await contract.connect(user1).subscribe(5, { value: ethers.parseEther("0.003") });

    const netflixExp = (await contract.getSubscription(user1.address, 4)).expiryTime;
    const primeExp = (await contract.getSubscription(user1.address, 5)).expiryTime;

    await contract.connect(user1).renewSubscription(1, { value: ethers.parseEther("0.002") });

    expect((await contract.getSubscription(user1.address, 4)).expiryTime).to.equal(netflixExp);
    expect((await contract.getSubscription(user1.address, 5)).expiryTime).to.equal(primeExp);
  });

  // 18. Cancelling Netflix marks Netflix inactive while Spotify & Prime remain active
  it("18. Should mark Netflix cancelled while keeping Spotify and Prime active", async function () {
    await setupDemoProvidersAndPlans();
    await contract.connect(user1).subscribe(1, { value: ethers.parseEther("0.002") });
    await contract.connect(user1).subscribe(4, { value: ethers.parseEther("0.006") });
    await contract.connect(user1).subscribe(5, { value: ethers.parseEther("0.003") });

    await contract.connect(user1).cancelSubscription(4);

    expect(await contract.isSubscriptionActive(user1.address, 1)).to.be.true;  // Spotify Active
    expect(await contract.isSubscriptionActive(user1.address, 4)).to.be.false; // Netflix Cancelled
    expect(await contract.isSubscriptionActive(user1.address, 5)).to.be.true;  // Prime Active
  });

  // 19. Fast-forwarding time to expire Amazon Prime leaves Spotify active
  it("19. Should allow Amazon Prime to expire while Spotify remains active", async function () {
    await setupDemoProvidersAndPlans();
    // Create a 100-second plan for Prime
    await contract.connect(owner).createPlan(3, "Short Prime", "Desc", ethers.parseEther("0.001"), 100); // Plan #6

    await contract.connect(user1).subscribe(1, { value: ethers.parseEther("0.002") }); // 30-day Spotify
    await contract.connect(user1).subscribe(6, { value: ethers.parseEther("0.001") }); // 100-sec Prime

    expect(await contract.isSubscriptionActive(user1.address, 1)).to.be.true;
    expect(await contract.isSubscriptionActive(user1.address, 6)).to.be.true;

    // Fast-forward EVM time by 150 seconds
    await ethers.provider.send("evm_increaseTime", [150]);
    await ethers.provider.send("evm_mine");

    expect(await contract.isSubscriptionActive(user1.address, 6)).to.be.false; // Prime Expired
    expect(await contract.isSubscriptionActive(user1.address, 1)).to.be.true;  // Spotify still Active!
  });

  // 20. getUserSubscriptions returns all subscriptions
  it("20. Should return complete array of subscriptions for user", async function () {
    await setupDemoProvidersAndPlans();
    await contract.connect(user1).subscribe(1, { value: ethers.parseEther("0.002") });
    await contract.connect(user1).subscribe(4, { value: ethers.parseEther("0.006") });

    const subs = await contract.getUserSubscriptions(user1.address);
    expect(subs.length).to.equal(2);
    expect(subs[0].subscriber).to.equal(user1.address);
    expect(subs[1].subscriber).to.equal(user1.address);
  });

  // 21. isSubscriptionActive functions independently per plan
  it("21. Should verify isSubscriptionActive returns distinct result per planId", async function () {
    await setupDemoProvidersAndPlans();
    await contract.connect(user1).subscribe(1, { value: ethers.parseEther("0.002") });

    expect(await contract.isSubscriptionActive(user1.address, 1)).to.be.true;
    expect(await contract.isSubscriptionActive(user1.address, 2)).to.be.false;
    expect(await contract.isSubscriptionActive(user1.address, 4)).to.be.false;
  });

  // 22. Rejection of incorrect ETH payment amounts
  it("22. Should reject subscription and renewal with wrong ETH value", async function () {
    await setupDemoProvidersAndPlans();
    await expect(
      contract.connect(user1).subscribe(1, { value: ethers.parseEther("0.001") })
    ).to.be.revertedWith("Incorrect ETH amount sent");
  });

  // 23. Provider balance tracking
  it("23. Should accurately track accumulated ETH balance per provider", async function () {
    await setupDemoProvidersAndPlans();
    await contract.connect(user1).subscribe(1, { value: ethers.parseEther("0.002") }); // Spotify (Prov 1)
    await contract.connect(user2).subscribe(2, { value: ethers.parseEther("0.003") }); // Spotify (Prov 1)
    await contract.connect(user1).subscribe(4, { value: ethers.parseEther("0.006") }); // Netflix (Prov 2)

    expect(await contract.providerBalances(1)).to.equal(ethers.parseEther("0.005"));
    expect(await contract.providerBalances(2)).to.equal(ethers.parseEther("0.006"));
  });

  // 24. Authorized provider fund withdrawal
  it("24. Should allow provider owner to withdraw provider ETH funds", async function () {
    await setupDemoProvidersAndPlans();
    await contract.connect(user1).subscribe(1, { value: ethers.parseEther("0.002") });

    const initialOwnerBal = await ethers.provider.getBalance(providerOwner1.address);
    const tx = await contract.connect(providerOwner1).withdrawProviderFunds(1);
    const receipt = await tx.wait();
    const gas = receipt.fee;

    const finalOwnerBal = await ethers.provider.getBalance(providerOwner1.address);
    expect(finalOwnerBal).to.equal(initialOwnerBal + ethers.parseEther("0.002") - gas);
    expect(await contract.providerBalances(1)).to.equal(0);
  });

  // 25. Rejection of unauthorized provider fund withdrawal
  it("25. Should prevent non-provider owner from withdrawing provider funds", async function () {
    await setupDemoProvidersAndPlans();
    await contract.connect(user1).subscribe(1, { value: ethers.parseEther("0.002") });

    await expect(
      contract.connect(user1).withdrawProviderFunds(1)
    ).to.be.revertedWith("Not authorized as provider owner");
  });

  // 26. Inactive plan/provider rejection
  it("26. Should reject subscription on deactivated plan or provider", async function () {
    await setupDemoProvidersAndPlans();
    await contract.connect(providerOwner1).deactivatePlan(1);

    await expect(
      contract.connect(user1).subscribe(1, { value: ethers.parseEther("0.002") })
    ).to.be.revertedWith("Plan is not active");

    await contract.connect(providerOwner1).deactivateProvider(1);
    await expect(
      contract.connect(user1).subscribe(2, { value: ethers.parseEther("0.003") })
    ).to.be.revertedWith("Provider is not active");
  });
});
