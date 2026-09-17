// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DecentralizedSubscription
 * @dev User-centric Multi-Subscription Payment System smart contract.
 * Allows a single wallet to hold multiple independent subscriptions from different service providers.
 */
contract DecentralizedSubscription {
    address public owner;

    struct Provider {
        uint256 id;
        address owner;
        string name;
        string description;
        bool active;
    }

    struct Plan {
        uint256 id; // Globally unique plan ID
        uint256 providerId;
        string name;
        string description;
        uint256 price; // in wei
        uint256 duration; // in seconds
        bool active;
    }

    struct Subscription {
        uint256 subscriptionId;
        address subscriber;
        uint256 providerId;
        uint256 planId;
        uint256 startTime;
        uint256 expiryTime;
        uint256 amountPaid;
        bool active;
    }

    uint256 public providerCount;
    uint256 public planCount;
    uint256 public subscriptionCount;

    mapping(uint256 => Provider) public providers;
    mapping(uint256 => Plan) public plans;
    mapping(uint256 => uint256[]) internal providerPlanIds;

    // Multi-subscription storage: subscriber wallet => planId => Subscription
    mapping(address => mapping(uint256 => Subscription)) public subscriptions;
    // List of plan IDs a user has ever subscribed to
    mapping(address => uint256[]) internal userSubscribedPlanIds;

    // Provider specific balance accounting
    mapping(uint256 => uint256) public providerBalances;

    // Events
    event ProviderCreated(uint256 indexed providerId, address indexed owner, string name);
    event ProviderUpdated(uint256 indexed providerId, string name, bool active);
    event ProviderDeactivated(uint256 indexed providerId);
    event ProviderReactivated(uint256 indexed providerId);

    event PlanCreated(uint256 indexed planId, uint256 indexed providerId, string name, uint256 price, uint256 duration);
    event PlanUpdated(uint256 indexed planId, string name, uint256 price, uint256 duration, bool active);
    event PlanDeactivated(uint256 indexed planId);
    event PlanReactivated(uint256 indexed planId);

    event SubscriptionCreated(
        address indexed subscriber,
        uint256 indexed providerId,
        uint256 indexed planId,
        uint256 subscriptionId,
        uint256 startTime,
        uint256 expiryTime,
        uint256 amountPaid
    );

    event SubscriptionRenewed(
        address indexed subscriber,
        uint256 indexed providerId,
        uint256 indexed planId,
        uint256 newExpiryTime,
        uint256 amountPaid
    );

    event SubscriptionCancelled(address indexed subscriber, uint256 indexed providerId, uint256 indexed planId);
    event ProviderFundsWithdrawn(uint256 indexed providerId, address indexed recipient, uint256 amount);
    event FundsWithdrawn(address indexed owner, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Caller is not contract owner");
        _;
    }

    modifier onlyProviderOwner(uint256 _providerId) {
        require(_providerId > 0 && _providerId <= providerCount, "Provider does not exist");
        require(
            msg.sender == providers[_providerId].owner || msg.sender == owner,
            "Not authorized as provider owner"
        );
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    // ==========================================
    // PROVIDER MANAGEMENT FUNCTIONS
    // ==========================================

    /**
     * @dev Registers a new service provider.
     */
    function createProvider(
        string memory _name,
        string memory _description,
        address _providerOwner
    ) external returns (uint256) {
        require(bytes(_name).length > 0, "Provider name cannot be empty");
        address pOwner = _providerOwner == address(0) ? msg.sender : _providerOwner;

        providerCount++;
        providers[providerCount] = Provider({
            id: providerCount,
            owner: pOwner,
            name: _name,
            description: _description,
            active: true
        });

        emit ProviderCreated(providerCount, pOwner, _name);
        return providerCount;
    }

    /**
     * @dev Updates provider details.
     */
    function updateProvider(
        uint256 _providerId,
        string memory _name,
        string memory _description
    ) external onlyProviderOwner(_providerId) {
        require(bytes(_name).length > 0, "Provider name cannot be empty");
        Provider storage prov = providers[_providerId];
        prov.name = _name;
        prov.description = _description;

        emit ProviderUpdated(_providerId, _name, prov.active);
    }

    /**
     * @dev Deactivates a provider.
     */
    function deactivateProvider(uint256 _providerId) external onlyProviderOwner(_providerId) {
        require(providers[_providerId].active, "Provider is already inactive");
        providers[_providerId].active = false;
        emit ProviderDeactivated(_providerId);
    }

    /**
     * @dev Reactivates an inactive provider.
     */
    function reactivateProvider(uint256 _providerId) external onlyProviderOwner(_providerId) {
        require(!providers[_providerId].active, "Provider is already active");
        providers[_providerId].active = true;
        emit ProviderReactivated(_providerId);
    }

    /**
     * @dev Returns full provider details.
     */
    function getProvider(uint256 _providerId) external view returns (Provider memory) {
        require(_providerId > 0 && _providerId <= providerCount, "Provider does not exist");
        return providers[_providerId];
    }

    /**
     * @dev Returns total provider count.
     */
    function getTotalProviders() external view returns (uint256) {
        return providerCount;
    }

    // ==========================================
    // PLAN MANAGEMENT FUNCTIONS
    // ==========================================

    /**
     * @dev Creates a new plan for a specific provider. Assigns a globally unique planId.
     */
    function createPlan(
        uint256 _providerId,
        string memory _name,
        string memory _description,
        uint256 _price,
        uint256 _duration
    ) external onlyProviderOwner(_providerId) returns (uint256) {
        require(bytes(_name).length > 0, "Plan name cannot be empty");
        require(_price > 0, "Price must be greater than zero");
        require(_duration > 0, "Duration must be greater than zero");

        planCount++;
        plans[planCount] = Plan({
            id: planCount,
            providerId: _providerId,
            name: _name,
            description: _description,
            price: _price,
            duration: _duration,
            active: true
        });

        providerPlanIds[_providerId].push(planCount);

        emit PlanCreated(planCount, _providerId, _name, _price, _duration);
        return planCount;
    }

    /**
     * @dev Updates an existing plan.
     */
    function updatePlan(
        uint256 _planId,
        string memory _name,
        string memory _description,
        uint256 _price,
        uint256 _duration
    ) external {
        require(_planId > 0 && _planId <= planCount, "Plan does not exist");
        Plan storage plan = plans[_planId];
        require(
            msg.sender == providers[plan.providerId].owner || msg.sender == owner,
            "Not authorized to update this plan"
        );
        require(bytes(_name).length > 0, "Plan name cannot be empty");
        require(_price > 0, "Price must be greater than zero");
        require(_duration > 0, "Duration must be greater than zero");

        plan.name = _name;
        plan.description = _description;
        plan.price = _price;
        plan.duration = _duration;

        emit PlanUpdated(_planId, _name, _price, _duration, plan.active);
    }

    /**
     * @dev Deactivates a plan.
     */
    function deactivatePlan(uint256 _planId) external {
        require(_planId > 0 && _planId <= planCount, "Plan does not exist");
        Plan storage plan = plans[_planId];
        require(
            msg.sender == providers[plan.providerId].owner || msg.sender == owner,
            "Not authorized to deactivate this plan"
        );
        require(plan.active, "Plan is already inactive");

        plan.active = false;
        emit PlanDeactivated(_planId);
    }

    /**
     * @dev Reactivates an inactive plan.
     */
    function reactivatePlan(uint256 _planId) external {
        require(_planId > 0 && _planId <= planCount, "Plan does not exist");
        Plan storage plan = plans[_planId];
        require(
            msg.sender == providers[plan.providerId].owner || msg.sender == owner,
            "Not authorized to reactivate this plan"
        );
        require(!plan.active, "Plan is already active");

        plan.active = true;
        emit PlanReactivated(_planId);
    }

    /**
     * @dev Returns single plan details by planId.
     */
    function getPlan(uint256 _planId) external view returns (Plan memory) {
        require(_planId > 0 && _planId <= planCount, "Plan does not exist");
        return plans[_planId];
    }

    /**
     * @dev Returns all plans belonging to a provider.
     */
    function getProviderPlans(uint256 _providerId) external view returns (Plan[] memory) {
        require(_providerId > 0 && _providerId <= providerCount, "Provider does not exist");
        uint256[] memory ids = providerPlanIds[_providerId];
        Plan[] memory result = new Plan[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            result[i] = plans[ids[i]];
        }
        return result;
    }

    /**
     * @dev Returns total plan count across all providers.
     */
    function getTotalPlans() external view returns (uint256) {
        return planCount;
    }

    // ==========================================
    // USER MULTI-SUBSCRIPTION FUNCTIONS
    // ==========================================

    /**
     * @dev Subscribe to a specific plan (identified by unique planId).
     */
    function subscribe(uint256 _planId) external payable {
        require(_planId > 0 && _planId <= planCount, "Plan does not exist");
        Plan memory plan = plans[_planId];
        require(plan.active, "Plan is not active");
        require(providers[plan.providerId].active, "Provider is not active");
        require(msg.value == plan.price, "Incorrect ETH amount sent");
        require(
            !_isSubActiveForPlan(msg.sender, _planId),
            "User already has an active subscription to this plan"
        );

        subscriptionCount++;
        uint256 startTime = block.timestamp;
        uint256 expiryTime = startTime + plan.duration;

        Subscription storage sub = subscriptions[msg.sender][_planId];
        if (sub.subscriber == address(0)) {
            userSubscribedPlanIds[msg.sender].push(_planId);
        }

        sub.subscriptionId = subscriptionCount;
        sub.subscriber = msg.sender;
        sub.providerId = plan.providerId;
        sub.planId = _planId;
        sub.startTime = startTime;
        sub.expiryTime = expiryTime;
        sub.amountPaid = msg.value;
        sub.active = true;

        providerBalances[plan.providerId] += msg.value;

        emit SubscriptionCreated(
            msg.sender,
            plan.providerId,
            _planId,
            subscriptionCount,
            startTime,
            expiryTime,
            msg.value
        );
    }

    /**
     * @dev Renews user's subscription to a specific plan.
     */
    function renewSubscription(uint256 _planId) external payable {
        require(_planId > 0 && _planId <= planCount, "Plan does not exist");
        Subscription storage sub = subscriptions[msg.sender][_planId];
        require(sub.subscriber != address(0), "No existing subscription found for this plan");
        require(sub.active, "Subscription is cancelled or revoked");

        Plan memory plan = plans[_planId];
        require(plan.active, "Plan is currently inactive");
        require(providers[plan.providerId].active, "Provider is currently inactive");
        require(msg.value == plan.price, "Incorrect ETH amount sent for renewal");

        uint256 newExpiry;
        if (block.timestamp < sub.expiryTime) {
            newExpiry = sub.expiryTime + plan.duration;
        } else {
            newExpiry = block.timestamp + plan.duration;
        }

        sub.expiryTime = newExpiry;
        sub.amountPaid = msg.value;
        sub.active = true;

        providerBalances[plan.providerId] += msg.value;

        emit SubscriptionRenewed(msg.sender, plan.providerId, _planId, newExpiry, msg.value);
    }

    /**
     * @dev Cancels user's subscription for a specific plan.
     */
    function cancelSubscription(uint256 _planId) external {
        require(_planId > 0 && _planId <= planCount, "Plan does not exist");
        Subscription storage sub = subscriptions[msg.sender][_planId];
        require(sub.subscriber != address(0), "No existing subscription found for this plan");
        require(sub.active, "Subscription is already cancelled or inactive");

        sub.active = false;

        emit SubscriptionCancelled(msg.sender, sub.providerId, _planId);
    }

    /**
     * @dev Gets subscription record for a specific plan for caller.
     */
    function getMySubscription(uint256 _planId) external view returns (Subscription memory) {
        return subscriptions[msg.sender][_planId];
    }

    /**
     * @dev Gets subscription record for a specific plan for any user address.
     */
    function getSubscription(address _subscriber, uint256 _planId) external view returns (Subscription memory) {
        return subscriptions[_subscriber][_planId];
    }

    /**
     * @dev Checks if a specific plan subscription is currently active for a user.
     */
    function isSubscriptionActive(address _subscriber, uint256 _planId) external view returns (bool) {
        return _isSubActiveForPlan(_subscriber, _planId);
    }

    /**
     * @dev Gets ALL subscriptions belonging to a user address.
     */
    function getUserSubscriptions(address _subscriber) external view returns (Subscription[] memory) {
        uint256[] memory planIds = userSubscribedPlanIds[_subscriber];
        Subscription[] memory result = new Subscription[](planIds.length);
        for (uint256 i = 0; i < planIds.length; i++) {
            result[i] = subscriptions[_subscriber][planIds[i]];
        }
        return result;
    }

    /**
     * @dev Internal helper for checking subscription active state for a specific plan.
     */
    function _isSubActiveForPlan(address _subscriber, uint256 _planId) internal view returns (bool) {
        Subscription memory sub = subscriptions[_subscriber][_planId];
        if (sub.subscriber == address(0)) return false;
        if (!sub.active) return false;
        if (block.timestamp >= sub.expiryTime) return false;
        return true;
    }

    // ==========================================
    // PAYMENT & WITHDRAWAL
    // ==========================================

    /**
     * @dev Withdraws accumulated ETH balance for a specific provider to its owner.
     */
    function withdrawProviderFunds(uint256 _providerId) external onlyProviderOwner(_providerId) {
        uint256 bal = providerBalances[_providerId];
        require(bal > 0, "No funds to withdraw for this provider");

        providerBalances[_providerId] = 0;
        address recipient = providers[_providerId].owner;

        (bool success, ) = payable(recipient).call{value: bal}("");
        require(success, "ETH transfer failed");

        emit ProviderFundsWithdrawn(_providerId, recipient, bal);
    }

    /**
     * @dev Master withdraw for any contract ETH balance to contract owner.
     */
    function withdrawFunds() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");

        (bool success, ) = payable(owner).call{value: balance}("");
        require(success, "ETH transfer failed");

        emit FundsWithdrawn(owner, balance);
    }
}
